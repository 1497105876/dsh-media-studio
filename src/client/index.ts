/**
 * Browser half of @gw/dsh-media-studio (client plugin, see
 * packages/client/ui-attachment/src/client/index.ts for the registration
 * pattern). Bundled into the lazy-CJS client artifact by scripts/build-client.mjs.
 *
 * Contributes:
 *  - `tool.call.toolview` rows for the three media tools (inline gallery /
 *    video player with download);
 *  - `conversation.chat.commandview` rows for `/image` `/video` (rich rows for
 *    `--wait` results);
 *  - a `conversation.chat.message.images` / `conversation.chat.user.images`
 *    fill that adds download to the regular chat image gallery;
 *  - the plugin's full configuration card on its Plugins-page detail
 *    (`plugins.bundle.config`): model entries + keys + defaults, over
 *    configForms scope and the official credential seam.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { MediaCommandRow } from './command-row.tsx'
import { MessageMediaImages } from './gallery.tsx'
import { bindNativeOpen } from './native-open.ts'
import { registerConfigCard } from './settings-card.tsx'
import { MediaToolRow } from './tool-row.tsx'

/** Slot registry + remote seams required by this presentation plugin. */
export const inject = ['slots', 'remote', 'remote.session', 'remote.credentials', 'configForms']

/** Register the media tool rows, command rows, message gallery fill, and the settings tab. */
export function apply(ctx: Context): void {
  // Host native-open channel: lets media cards hand files to the OS-associated
  // application; cards hide the action when the host can't open native paths.
  bindNativeOpen((ctx as unknown as { 'remote.session'?: unknown })['remote.session'] ?? (ctx as unknown as { remote?: { session?: unknown } }).remote?.session)
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
  // entry loses the priority election. dsh 0.2.1 起消息图拆成两个 slot：
  // `conversation.chat.message.images`（模型输出的图）与
  // `conversation.chat.user.images`（用户上传的图，含提交中的本地回显预览），
  // owner 契约完全相同，两个都挂，保持「会话里每张图都能直接下载」。
  for (const name of ['conversation.chat.message.images', 'conversation.chat.user.images'] as const) {
    ctx.slots.inject(name, () => ctx.slots.register(
      { name, priority: -1 }, MessageMediaImages))
  }

  registerConfigCard(ctx)
}
