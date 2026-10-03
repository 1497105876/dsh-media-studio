/**
 * Slash commands: `/image <prompt>` and `/video <prompt>`.
 *
 * Commands return immediately (the card shows "生成中…", nothing blocks);
 * the finished media is delivered by waking the agent, whose reply carries
 * the markdown image lines — the picture ends up inside the AI's message
 * (see instructions.ts). No user-bubble impersonation, no collapsed cards.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type { Config } from './config.js'
import { deliverMediaCompletion, ensureMediaInstructions } from './instructions.js'
import { resolveOutputDir, toDataUri } from './media.js'
import { resolveApiKey, resolveModel, mediaPayload } from './tools.js'
import { encodeCommandPayload, type MediaItemMeta } from './types.js'
import { commitImage, commitVideo } from './media.js'
import { generateImage, generateVideo, type ReferenceImage } from './providers.js'

/** File extension for a generated image media type. */
function imageExtension(mediaType: 'image/png' | 'image/jpeg' | 'image/webp'): string {
  return mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png'
}

function itemLine(item: MediaItemMeta): string {
  return item.path === undefined ? `- ${item.name}` : `- \`${item.path}\``
}

/** Markdown image lines the woken reply must echo (see instructions.ts). */
function markdownGallery(items: readonly MediaItemMeta[]): string {
  return items
    .filter(item => item.path !== undefined)
    .map(item => `![生成结果](${item.path!.replace(/\\/g, '/')})`)
    .join('\n')
}

/** Turn the command's submitted attachments into reference-image inputs. */
async function referencesFromAttachments(
  ctx: Context,
  invocation: CommandInvocation,
): Promise<ReferenceImage[]> {
  const refs: ReferenceImage[] = []
  for (const block of invocation.attachments) {
    if (block.type !== 'image') continue
    const stored = await ctx.attachments.readImage(block.attachment, invocation.signal)
    refs.push({ dataUri: toDataUri(stored.data, stored.ref.mediaType) })
  }
  return refs
}

/** Register `/image` and `/video`. */
export function registerMediaCommands(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.commands.register({
    name: 'image',
    description: '生成图片：/image <提示词>（可附图做图生图）。异步生成，完成后 AI 会把图片作为消息发到会话。',
    input: { hint: '提示词', attachments: true },
    handler: async (invocation: CommandInvocation): Promise<CommandResult> => {
      const prompt = invocation.rawInput.trim()
      if (prompt === '') return { kind: 'error', text: '用法：/image <提示词>（可附参考图做图生图）' }
      const entry = resolveModel(config.imageModels.get(), config.defaultImageModel.get(), undefined, 'image')
      const apiKey = await resolveApiKey(ctx, entry)
      const referenceImages = await referencesFromAttachments(ctx, invocation)
      const cwd = invocation.agent.session.header.cwd
      const outputDir = resolveOutputDir(config.outputDir.get(), cwd)
      const agent = invocation.agent
      ensureMediaInstructions(ctx, agent.id)
      const controller = new AbortController()
      void (async () => {
        try {
          const generated = await generateImage(entry, apiKey, {
            prompt,
            resolution: config.imageResolution.get(),
            aspectRatio: config.imageAspectRatio.get(),
            referenceImages,
            signal: controller.signal,
            timeoutMs: config.requestTimeoutSec.get() * 1000,
          })
          const name = `image-${entry.id}-${Date.now()}.${imageExtension(generated.mediaType)}`
          const item = await commitImage(ctx.attachments, {
            name,
            bytes: generated.bytes,
            mediaType: generated.mediaType,
            outputDir,
            autoSave: config.autoSave.get(),
          })
          const lines = markdownGallery([item])
          deliverMediaCompletion(
            agent,
            `🖼️ 图片生成完成（${entry.label || entry.id}）：\n${itemLine(item)}\n${lines}\n（按媒体展示规范：在你的回复中原样输出上述图片行，并简短确认。）`,
            `图片生成完成（${entry.label || entry.id}）`,
          )
        } catch (error) {
          if (controller.signal.aborted) return
          const message = `⚠️ 图片生成失败：${error instanceof Error ? error.message : String(error)}\n（系统通知：请向用户简短说明失败原因。）`
          deliverMediaCompletion(agent, message, '图片生成失败')
        }
      })()
      return { kind: 'success', text: `🖼️ 图片生成已开始（${entry.label || entry.id}），完成后 AI 会把图片发到会话。` }
    },
  }))

  ctx.effect(() => ctx.commands.register({
    name: 'video',
    description: '生成视频：/video <提示词>。异步生成（通常几分钟），完成后 AI 会把视频作为消息发到会话。',
    input: { hint: '提示词', attachments: false },
    handler: async (invocation: CommandInvocation): Promise<CommandResult> => {
      const prompt = invocation.rawInput.trim()
      if (prompt === '') return { kind: 'error', text: '用法：/video <提示词>' }
      const entry = resolveModel(config.videoModels.get(), config.defaultVideoModel.get(), undefined, 'video')
      const apiKey = await resolveApiKey(ctx, entry)
      const cwd = invocation.agent.session.header.cwd
      const outputDir = resolveOutputDir(config.outputDir.get(), cwd)
      const agent = invocation.agent
      ensureMediaInstructions(ctx, agent.id)
      const controller = new AbortController()
      void (async () => {
        try {
          const generated = await generateVideo(entry, apiKey, {
            prompt,
            seconds: config.videoSeconds.get(),
            size: config.videoSize.get(),
            aspectRatio: config.videoAspectRatio.get(),
            mode: 'text' as const,
            referenceImages: [] as readonly ReferenceImage[],
            signal: controller.signal,
            timeoutMs: config.requestTimeoutSec.get() * 1000,
            pollIntervalMs: config.videoPollIntervalSec.get() * 1000,
            pollTimeoutMs: config.videoPollTimeoutSec.get() * 1000,
          })
          const items = [await commitVideo({
            name: `video-${entry.id}-${Date.now()}.mp4`,
            bytes: generated.bytes,
            outputDir,
            autoSave: true,
          })]
          const sizeMb = (items[0].bytes / (1024 * 1024)).toFixed(1)
          deliverMediaCompletion(
            agent,
            `🎬 视频生成完成（${entry.label || entry.id}）：\n${items.map(itemLine).join('\n')}（${sizeMb} MB）\n（按媒体展示规范：在你的回复中说明视频已生成、给出文件路径，并简短确认。）`,
            `视频生成完成（${entry.label || entry.id}）`,
          )
        } catch (error) {
          if (controller.signal.aborted) return
          const message = `⚠️ 视频生成失败：${error instanceof Error ? error.message : String(error)}\n（系统通知：请向用户简短说明失败原因。）`
          deliverMediaCompletion(agent, message, '视频生成失败')
        }
      })()
      return { kind: 'success', text: `🎬 视频生成已开始（${entry.label || entry.id}），通常需要几分钟，完成后 AI 会把视频发到会话。` }
    },
  }))
}
