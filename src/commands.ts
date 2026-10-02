/**
 * Slash commands: `/image <prompt>` and `/video <prompt>`.
 *
 * Default behavior is background generation with a chat push on completion
 * (matching the tool flow). Prefix the prompt with `--wait` to run
 * synchronously — the command row then renders the media inline (image
 * gallery / video player with download + save-as) from the result payload.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type { Config } from './config.js'
import { deliverMediaMessage, startMediaJob } from './jobs.js'
import { resolveOutputDir, toDataUri } from './media.js'
import { resolveApiKey, resolveModel, buildImagePushContent, buildVideoPushContent, mediaPayload } from './tools.js'
import { encodeCommandPayload, type MediaItemMeta } from './types.js'
import { commitImage, commitVideo, imageMediaTypeForPath, sniffImageMediaType } from './media.js'
import { generateImage, generateVideo, type ReferenceImage } from './providers.js'

const WAIT_FLAG = '--wait'

/** File extension for a generated image media type. */
function imageExtension(mediaType: 'image/png' | 'image/jpeg' | 'image/webp'): string {
  return mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png'
}

function stripWaitFlag(rawInput: string): { prompt: string; wait: boolean } {
  const trimmed = rawInput.trim()
  if (trimmed === WAIT_FLAG) return { prompt: '', wait: true }
  if (trimmed.startsWith(`${WAIT_FLAG} `)) return { prompt: trimmed.slice(WAIT_FLAG.length + 1).trim(), wait: true }
  return { prompt: trimmed, wait: false }
}

function itemLine(item: MediaItemMeta): string {
  return item.path === undefined ? `- ${item.name}` : `- \`${item.path}\``
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
    description: '生成图片：/image <提示词>（可附图做图生图）。加 --wait 前缀同步等待并在命令卡片内联展示。',
    input: { hint: '提示词', attachments: true },
    handler: async (invocation: CommandInvocation): Promise<CommandResult> => {
      const { prompt, wait } = stripWaitFlag(invocation.rawInput)
      if (prompt === '') return { kind: 'error', text: '用法：/image [--wait] <提示词>（可附参考图做图生图）' }
      try {
        const entry = resolveModel(config.imageModels.get(), config.defaultImageModel.get(), undefined, 'image')
        const apiKey = await resolveApiKey(ctx, entry)
        const referenceImages = await referencesFromAttachments(ctx, invocation)
        const cwd = invocation.agent.session.header.cwd
        const outputDir = resolveOutputDir(config.outputDir.get(), cwd)
        const params = {
          prompt,
          resolution: config.imageResolution.get(),
          aspectRatio: config.imageAspectRatio.get(),
          referenceImages,
        }
        if (wait) {
          const generated = await generateImage(entry, apiKey, {
            ...params,
            signal: invocation.signal,
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
          const text = `✅ 图片生成完成（${entry.label || entry.id}）：\n${itemLine(item)}`
          return {
            kind: 'success',
            text: `${text}\n${encodeCommandPayload(mediaPayload('image', text, [item]))}`,
          }
        }
        const agent = invocation.agent
        startMediaJob(ctx, {
          kind: 'media-image',
          label: prompt,
          owner: agent.id,
          work: async (job, signal) => {
            job.updateProgress(`generating image with ${entry.id}…`)
            const generated = await generateImage(entry, apiKey, { ...params, signal, timeoutMs: config.requestTimeoutSec.get() * 1000 })
            const name = `image-${entry.id}-${Date.now()}.${imageExtension(generated.mediaType)}`
            const item = await commitImage(ctx.attachments, {
              name,
              bytes: generated.bytes,
              mediaType: generated.mediaType,
              outputDir,
              autoSave: config.autoSave.get(),
            })
            deliverMediaMessage(agent, buildImagePushContent(`🖼️ 图片生成完成（${entry.label || entry.id}）`, [item]), `图片生成完成（${entry.label || entry.id}）`)
            return { summary: `image generated: ${item.path ?? item.name}` }
          },
        })
        return { kind: 'success', text: `⏳ 图片生成已开始（${entry.label || entry.id}），完成后会推送到会话。` }
      } catch (error) {
        return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
      }
    },
  }))

  ctx.effect(() => ctx.commands.register({
    name: 'video',
    description: '生成视频：/video <提示词>。默认后台生成完成后推送进会话；加 --wait 前缀同步等待并在命令卡片内联播放。',
    input: { hint: '提示词', attachments: false },
    handler: async (invocation: CommandInvocation): Promise<CommandResult> => {
      const { prompt, wait } = stripWaitFlag(invocation.rawInput)
      if (prompt === '') return { kind: 'error', text: '用法：/video [--wait] <提示词>' }
      try {
        const entry = resolveModel(config.videoModels.get(), config.defaultVideoModel.get(), undefined, 'video')
        const apiKey = await resolveApiKey(ctx, entry)
        const cwd = invocation.agent.session.header.cwd
        const outputDir = resolveOutputDir(config.outputDir.get(), cwd)
        const params = {
          prompt,
          seconds: config.videoSeconds.get(),
          size: config.videoSize.get(),
          aspectRatio: config.videoAspectRatio.get(),
          mode: 'text' as const,
          referenceImages: [] as readonly ReferenceImage[],
        }
        const runGeneration = async (signal: AbortSignal, onProgress?: (line: string) => void): Promise<MediaItemMeta[]> => {
          const generated = await generateVideo(entry, apiKey, {
            ...params,
            signal,
            timeoutMs: config.requestTimeoutSec.get() * 1000,
            pollIntervalMs: config.videoPollIntervalSec.get() * 1000,
            pollTimeoutMs: config.videoPollTimeoutSec.get() * 1000,
            ...(onProgress === undefined ? {} : { onProgress }),
          })
          return [await commitVideo({
            name: `video-${entry.id}-${Date.now()}.mp4`,
            bytes: generated.bytes,
            outputDir,
            autoSave: true,
          })]
        }
        if (wait) {
          const videos = await runGeneration(invocation.signal)
          const text = `✅ 视频生成完成（${entry.label || entry.id}）：\n${videos.map(itemLine).join('\n')}`
          return {
            kind: 'success',
            text: `${text}\n${encodeCommandPayload(mediaPayload('video', text, videos))}`,
          }
        }
        const agent = invocation.agent
        startMediaJob(ctx, {
          kind: 'media-video',
          label: prompt,
          owner: agent.id,
          work: async (job, signal) => {
            job.updateProgress(`generating video with ${entry.id}…`)
            const videos = await runGeneration(signal, line => job.updateProgress(line))
            deliverMediaMessage(agent, buildVideoPushContent(`🎬 视频生成完成（${entry.label || entry.id}）`, videos), `视频生成完成（${entry.label || entry.id}）`)
            return { summary: `video generated: ${videos[0]?.path ?? ''}` }
          },
        })
        return { kind: 'success', text: `⏳ 视频生成已开始（${entry.label || entry.id}），通常需要几分钟，完成后会推送到会话。` }
      } catch (error) {
        return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
      }
    },
  }))
}
