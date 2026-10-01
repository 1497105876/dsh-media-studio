/**
 * dsh-media-studio — DeepSeek Harness plugin.
 *
 * Host half: registers `generate_image` / `generate_video` / `send_media`
 * tools plus the `/image` `/video` slash commands, backed by pluggable
 * generation providers (Agnes presets + OpenAI-compatible custom entries).
 * Generated media is auto-saved to the output directory and delivered to the
 * chat (inline image gallery; video file + playable path), while the browser
 * half (`./client`) renders rich tool rows and command rows with preview,
 * download, and save-as actions.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-attachment'
import type {} from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-jobs'
import type {} from '@deepseek-ai/dsh-tools'
import { Config, type Config as MediaStudioConfig } from './config.js'
import { registerMediaCommands } from './commands.js'
import { registerMediaTools } from './tools.js'

export const name = 'media-studio'

export const inject = ['tools', 'jobs', 'commands', 'attachments', 'credentials']

export { Config }
export type { MediaStudioConfig }
export type { MediaModelEntry, MediaItemMeta, MediaResultMeta, CommandMediaPayload } from './types.js'

export function apply(ctx: Context, config: MediaStudioConfig): void {
  registerMediaTools(ctx, config)
  registerMediaCommands(ctx, config)
}
