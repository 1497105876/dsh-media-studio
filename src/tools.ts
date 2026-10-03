/**
 * Model-facing tools: `generate_image`, `generate_video`, `send_media`.
 *
 * Every tool returns one canonical JSON value (`output.schema`), renders model
 * content from it (`output.render` — image blocks are legal tool-result
 * content), and projects replayable UI metadata (`output.presentationMeta`)
 * that the web client half turns into an inline gallery / video player with
 * download and save-as actions.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from './config.js'
import {
  commitImage, commitVideo, describeLocalFile, readReferenceImage, resolveOutputDir,
  sniffImageMediaType, imageMediaTypeForPath,
} from './media.js'
import { generateImage, generateVideo, type ReferenceImage } from './providers.js'
import type {
  CommandMediaPayload, ImageGenerationValue, MediaItemMeta, MediaModelEntry, MediaProvider,
  MediaSendValue, VideoGenerationValue,
} from './types.js'

const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9'] as const
const RESOLUTIONS = ['1K', '2K', '3K', '4K'] as const
const VIDEO_SIZES = ['720P', '1080P', '1K', '2K'] as const
const VIDEO_MODES = ['text', 'keyframe', 'reference'] as const

/** Shared item node for canonical values and presentation metadata. */
const MEDIA_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['image', 'video', 'file'], required: true },
    name: { type: 'string', required: true },
    path: { type: 'string' },
    bytes: { type: 'integer', required: true },
    mediaType: { type: 'string' },
    width: { type: 'integer' },
    height: { type: 'integer' },
    attachmentId: { type: 'string' },
  },
} as const

const IMAGE_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['image-generation'], required: true },
    status: { type: 'string', enum: ['started', 'completed'], required: true },
    jobId: { type: 'string' },
    prompt: { type: 'string', required: true },
    model: { type: 'string', required: true },
    provider: { type: 'string', enum: ['agnes', 'openai', 'openai-videos'], required: true },
    images: { type: 'array', items: MEDIA_ITEM_SCHEMA, required: true },
  },
} as const

const VIDEO_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['video-generation'], required: true },
    status: { type: 'string', enum: ['started', 'completed'], required: true },
    jobId: { type: 'string' },
    prompt: { type: 'string', required: true },
    model: { type: 'string', required: true },
    provider: { type: 'string', enum: ['agnes', 'openai', 'openai-videos'], required: true },
    videos: { type: 'array', items: MEDIA_ITEM_SCHEMA, required: true },
  },
} as const

const SEND_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['media-send'], required: true },
    caption: { type: 'string' },
    files: { type: 'array', items: MEDIA_ITEM_SCHEMA, required: true },
  },
} as const

/** Resolve a model entry by id (falling back to the configured default). */
export function resolveModel(
  entries: readonly MediaModelEntry[],
  defaultId: string,
  requested: string | undefined,
  kind: 'image' | 'video',
): MediaModelEntry {
  const id = (requested === undefined || requested.trim() === '') ? defaultId : requested.trim()
  const found = entries.find(entry => entry.id === id)
  if (found !== undefined) return found
  const known = entries.map(entry => entry.id).join(', ') || '(none)'
  throw new Error(`unknown ${kind} model "${id}"; configured entries: ${known}`)
}

/** Resolve the API key through the credential seam, then plain environment. */
export async function resolveApiKey(ctx: Context, entry: MediaModelEntry): Promise<string> {
  const envName = entry.apiKeyEnv.trim()
  if (envName === '') throw new Error(`model "${entry.id}" has no apiKeyEnv configured`)
  try {
    const resolved = await ctx.credentials.resolve(credentialRef(envName))
    if (resolved?.value !== undefined && resolved.value !== '') return resolved.value
  } catch {
    // Fall through to the plain environment below.
  }
  const fromEnv = process.env[envName]
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv
  throw new Error(`missing API key: set the ${envName} environment variable (model "${entry.id}")`)
}

function sessionCwd(agent: { session: { header: { cwd?: string } } } | undefined): string | undefined {
  return agent?.session.header.cwd
}

function imageBlockFor(item: MediaItemMeta): ContentBlock | undefined {
  if (item.attachmentId === undefined || item.mediaType === undefined) return undefined
  return {
    type: 'image',
    attachment: {
      attachmentId: item.attachmentId as ImageAttachmentRef['attachmentId'],
      mediaType: item.mediaType as ImageMediaType,
      bytes: item.bytes,
      width: item.width ?? 0,
      height: item.height ?? 0,
      name: item.name,
    },
  }
}

function itemLine(item: MediaItemMeta): string {
  return item.path === undefined ? `- ${item.name}` : `- \`${item.path}\``
}

function formatImageSummary(images: readonly MediaItemMeta[]): string {
  return `✅ 图片生成完成（${images.length} 张）：\n${images.map(itemLine).join('\n')}`
}

function formatVideoSummary(videos: readonly MediaItemMeta[]): string {
  return `✅ 视频生成完成：\n${videos.map(itemLine).join('\n')}`
}

interface GenerationContext {
  ctx: Context
  config: Config
  outputDir: string
  autoSave: boolean
}

async function runImageGeneration(
  gc: GenerationContext,
  entry: MediaModelEntry,
  apiKey: string,
  params: {
    prompt: string
    resolution: string
    aspectRatio: string
    referenceImages: readonly ReferenceImage[]
    signal: AbortSignal
    onProgress?: (line: string) => void
  },
): Promise<MediaItemMeta[]> {
  const generated = await generateImage(entry, apiKey, {
    prompt: params.prompt,
    resolution: params.resolution,
    aspectRatio: params.aspectRatio,
    referenceImages: params.referenceImages,
    signal: params.signal,
    timeoutMs: gc.config.requestTimeoutSec.get() * 1000,
  })
  const name = `image-${entry.id}-${Date.now()}.${generated.mediaType === 'image/jpeg' ? 'jpg' : generated.mediaType === 'image/webp' ? 'webp' : 'png'}`
  const item = await commitImage(gc.ctx.attachments, {
    name,
    bytes: generated.bytes,
    mediaType: generated.mediaType,
    outputDir: gc.outputDir,
    autoSave: gc.autoSave,
  })
  return [item]
}

async function runVideoGeneration(
  gc: GenerationContext,
  entry: MediaModelEntry,
  apiKey: string,
  params: {
    prompt: string
    seconds: number
    size: string
    aspectRatio: string
    mode: 'text' | 'keyframe' | 'reference'
    firstFrame?: ReferenceImage
    lastFrame?: ReferenceImage
    referenceImages: readonly ReferenceImage[]
    signal: AbortSignal
    onProgress?: (line: string) => void
  },
): Promise<MediaItemMeta[]> {
  const generated = await generateVideo(entry, apiKey, {
    prompt: params.prompt,
    seconds: params.seconds,
    size: params.size,
    aspectRatio: params.aspectRatio,
    mode: params.mode,
    ...(params.firstFrame === undefined ? {} : { firstFrame: params.firstFrame }),
    ...(params.lastFrame === undefined ? {} : { lastFrame: params.lastFrame }),
    referenceImages: params.referenceImages,
    signal: params.signal,
    timeoutMs: gc.config.requestTimeoutSec.get() * 1000,
    pollIntervalMs: gc.config.videoPollIntervalSec.get() * 1000,
    pollTimeoutMs: gc.config.videoPollTimeoutSec.get() * 1000,
    ...(params.onProgress === undefined ? {} : { onProgress: params.onProgress }),
  })
  const item = await commitVideo({
    name: `video-${entry.id}-${Date.now()}.mp4`,
    bytes: generated.bytes,
    outputDir: gc.outputDir,
    autoSave: true,
  })
  return [item]
}

function generationContext(ctx: Context, config: Config, cwd: string | undefined): GenerationContext {
  return {
    ctx,
    config,
    outputDir: resolveOutputDir(config.outputDir.get(), cwd),
    autoSave: config.autoSave.get(),
  }
}

/** Register the three media tools. */
export function registerMediaTools(ctx: Context, config: Config): void {
  ctx.tools.register(defineTool({
    name: 'generate_image',
    description:
      '生成图片并在对话中展示（同步生成，图片直接出现在对话中）。'
      + '支持文生图与图生图（reference_images 传本地路径或 https URL）。',
    parameters: {
      prompt: { type: 'string', required: true, description: '图片描述 / 编辑指令（中文英文均可）' },
      model: { type: 'string', description: '生图模型条目 id（见插件配置 imageModels）；省略用默认模型' },
      resolution: { type: 'string', enum: RESOLUTIONS, description: '分辨率档位，默认取配置 imageResolution' },
      aspect_ratio: { type: 'string', enum: ASPECT_RATIOS, description: '画幅比例，默认取配置 imageAspectRatio' },
      reference_images: {
        type: 'array',
        items: { type: 'string' },
        description: '图生图参考图：本地文件路径、https URL 或 data URI。必须是字符串数组，即使只有一张：["C:\\a.png"]',
      },
    },
    output: {
      schema: IMAGE_VALUE_SCHEMA,
      render: (_args, value) => {
        const data = value as unknown as ImageGenerationValue
        const blocks: ContentBlock[] = []
        if (data.status === 'started') {
          blocks.push({
            type: 'text',
            text: `⏳ 图片后台生成已开始${data.jobId === undefined ? '' : `（任务 ${data.jobId}）`}，完成后会把图片推送到会话。`,
          })
        } else {
          blocks.push({ type: 'text', text: formatImageSummary(data.images) })
          for (const item of data.images) {
            const block = imageBlockFor(item)
            if (block !== undefined) blocks.push(block)
          }
        }
        return blocks
      },
      presentationMeta: (_args, value) => {
        const data = value as unknown as ImageGenerationValue
        return JSON.parse(JSON.stringify({ items: data.images }))
      },
    },
    presentCall: args => ({
      card: 'generic',
      title: `生成图片：${String(args.prompt ?? '').slice(0, 60)}`,
    }),
    async execute(args, exec) {
      const entry = resolveModel(config.imageModels.get(), config.defaultImageModel.get(), args.model, 'image')
      const apiKey = await resolveApiKey(ctx, entry)
      const referenceImages = await Promise.all((args.reference_images ?? []).map(readReferenceImage))
      const gc = generationContext(ctx, config, sessionCwd(exec.agent))
      const params = {
        prompt: args.prompt,
        resolution: args.resolution ?? config.imageResolution.get(),
        aspectRatio: args.aspect_ratio ?? config.imageAspectRatio.get(),
        referenceImages,
      }
      const base = {
        kind: 'image-generation' as const,
        prompt: params.prompt,
        model: entry.id,
        provider: entry.provider as MediaProvider,
      }
      // 图片视频一律同步生成：工具结果直接携带媒体（AI 的回合内平铺展示，
      // 不折叠、不冒充用户）；后台推送机制已整体移除。
      const images = await runImageGeneration(gc, entry, apiKey, { ...params, signal: exec.signal })
      return { ...base, status: 'completed' as const, images }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'generate_video',
    description:
      '生成视频并在对话中展示（同步生成，通常需要几分钟，视频直接出现在对话中）。'
      + '支持文生视频、首尾帧（keyframe 模式 + first_frame/last_frame）与参考图（reference 模式）。',
    parameters: {
      prompt: { type: 'string', required: true, description: '视频描述（reference 模式可用 <Picture 1> 指代参考图）' },
      model: { type: 'string', description: '视频模型条目 id（见插件配置 videoModels）；省略用默认模型' },
      seconds: { type: 'integer', description: '时长（秒）4–12，默认取配置 videoSeconds' },
      size: { type: 'string', enum: VIDEO_SIZES, description: '分辨率档位，默认取配置 videoSize' },
      aspect_ratio: { type: 'string', enum: ASPECT_RATIOS, description: '画幅比例，默认取配置 videoAspectRatio' },
      mode: { type: 'string', enum: VIDEO_MODES, description: 'text=文生视频；keyframe=首尾帧；reference=参考图' },
      first_frame: { type: 'string', description: 'keyframe 模式：首帧图片路径或 https URL' },
      last_frame: { type: 'string', description: 'keyframe 模式：尾帧图片路径或 https URL' },
      reference_images: { type: 'array', items: { type: 'string' }, description: 'reference 模式的参考图。必须是字符串数组，即使只有一张：["C:\\a.png"]' },
    },
    output: {
      schema: VIDEO_VALUE_SCHEMA,
      render: (_args, value) => {
        const data = value as unknown as VideoGenerationValue
        const blocks: ContentBlock[] = []
        if (data.status === 'started') {
          blocks.push({
            type: 'text',
            text: `⏳ 视频后台生成已开始${data.jobId === undefined ? '' : `（任务 ${data.jobId}）`}，通常需要几分钟，完成后会推送到会话。`,
          })
        } else {
          blocks.push({ type: 'text', text: formatVideoSummary(data.videos) })
        }
        return blocks
      },
      presentationMeta: (_args, value) => {
        const data = value as unknown as VideoGenerationValue
        return JSON.parse(JSON.stringify({ items: data.videos }))
      },
    },
    presentCall: args => ({
      card: 'generic',
      title: `生成视频：${String(args.prompt ?? '').slice(0, 60)}`,
    }),
    async execute(args, exec) {
      const entry = resolveModel(config.videoModels.get(), config.defaultVideoModel.get(), args.model, 'video')
      const apiKey = await resolveApiKey(ctx, entry)
      const referenceImages = await Promise.all((args.reference_images ?? []).map(readReferenceImage))
      const mode = args.mode ?? 'text'
      const firstFrame = args.first_frame === undefined ? undefined : await readReferenceImage(args.first_frame)
      const lastFrame = args.last_frame === undefined ? undefined : await readReferenceImage(args.last_frame)
      const gc = generationContext(ctx, config, sessionCwd(exec.agent))
      const params = {
        prompt: args.prompt,
        seconds: args.seconds ?? config.videoSeconds.get(),
        size: args.size ?? config.videoSize.get(),
        aspectRatio: args.aspect_ratio ?? config.videoAspectRatio.get(),
        mode,
        ...(firstFrame === undefined ? {} : { firstFrame }),
        ...(lastFrame === undefined ? {} : { lastFrame }),
        referenceImages,
      }
      const base = {
        kind: 'video-generation' as const,
        prompt: params.prompt,
        model: entry.id,
        provider: entry.provider as MediaProvider,
      }
      // 视频同样同步生成（等几分钟），结果内联展示。
      const videos = await runVideoGeneration(gc, entry, apiKey, { ...params, signal: exec.signal })
      return { ...base, status: 'completed' as const, videos }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'send_media',
    description:
      '把本地已有的图片或视频文件发送到对话中展示（图片内联画廊、视频可播放/下载）。'
      + '只接受本地文件路径；图片会作为持久附件进入会话，视频/其他文件按文件卡片+路径展示。',
    parameters: {
      paths: { type: 'array', items: { type: 'string' }, required: true, description: '本地文件路径的字符串数组，即使只有一个文件也必须用数组：["C:\\a\\v.mp4"]，不要传单个字符串' },
      caption: { type: 'string', description: '随图说明文字' },
    },
    output: {
      schema: SEND_VALUE_SCHEMA,
      render: (_args, value) => {
        const data = value as unknown as MediaSendValue
        const head = data.caption === undefined || data.caption === '' ? '📎 已发送文件：' : `📎 ${data.caption}`
        const blocks: ContentBlock[] = [{ type: 'text', text: `${head}\n${data.files.map(itemLine).join('\n')}` }]
        for (const item of data.files) {
          const block = imageBlockFor(item)
          if (block !== undefined) blocks.push(block)
        }
        return blocks
      },
      presentationMeta: (_args, value) => {
        const data = value as unknown as MediaSendValue
        return JSON.parse(JSON.stringify({ items: data.files }))
      },
    },
    presentCall: args => ({
      card: 'generic',
      title: `发送文件：${(args.paths ?? []).length} 个`,
    }),
    async execute(args) {
      const paths = args.paths
      if (paths.length === 0) throw new Error('paths must not be empty')
      const files: MediaItemMeta[] = []
      for (const rawPath of paths) {
        const described = await describeLocalFile(rawPath)
        if (described.kind === 'image') {
          const { readFile } = await import('node:fs/promises')
          const bytes = new Uint8Array(await readFile(described.path!))
          const mediaType = imageMediaTypeForPath(described.path!) ?? sniffImageMediaType(bytes) ?? 'image/png'
          const ref = await ctx.attachments.saveImage({ data: bytes, mediaType, name: described.name })
          files.push({
            ...described,
            bytes: ref.bytes,
            mediaType: ref.mediaType,
            width: ref.width,
            height: ref.height,
            attachmentId: ref.attachmentId as string,
          })
        } else {
          files.push(described)
        }
      }
      return { kind: 'media-send' as const, ...(args.caption === undefined ? {} : { caption: args.caption }), files }
    },
  }))
}

/** Payload projection shared with the slash commands. */
export function mediaPayload(kind: 'image' | 'video', text: string, items: readonly MediaItemMeta[]): CommandMediaPayload {
  return { v: 1, kind, text, items: [...items] }
}
