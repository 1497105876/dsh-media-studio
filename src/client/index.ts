/**
 * Browser half of dsh-media-studio (client plugin, see
 * packages/client/ui-attachment/src/client/index.ts for the registration
 * pattern). Bundled into the lazy-CJS client artifact by scripts/build-client.mjs.
 *
 * Contributes:
 *  - `tool.call.toolview` rows for the three media tools (inline gallery /
 *    video player with download + save-as);
 *  - `conversation.chat.commandview` rows for `/image` `/video` (rich rows for
 *    `--wait` results);
 *  - a `conversation.message.images` fill that adds download + save-as to the
 *    regular chat image gallery.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { MediaCommandRow } from './command-row.tsx'
import { MessageMediaImages } from './gallery.tsx'
import { MediaToolRow } from './tool-row.tsx'

/** Slot registry required by this presentation plugin. */
export const inject = ['slots']

/** Register the media tool rows, command rows, and the message gallery fill. */
export function apply(ctx: Context): void {
  for (const key of ['generate_image', 'generate_video', 'send_media']) {
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
      { name: 'tool.call.toolview', key }, MediaToolRow))
  }
  for (const key of ['image', 'video']) {
    ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register(
      { name: 'conversation.chat.commandview', key }, MediaCommandRow))
  }
  // Replacing the stock gallery cell is the documented "reuse the cell to
  // replace its presentation" path; the fallback gallery renders when this
  // entry loses the priority election.
  ctx.slots.inject('conversation.message.images', () => ctx.slots.register(
    { name: 'conversation.message.images', priority: -1 }, MessageMediaImages))
}
