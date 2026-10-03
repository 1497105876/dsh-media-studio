/**
 * @gw/dsh-media-studio — DeepSeek Harness plugin.
 *
 * Host half: registers `generate_image` / `generate_video` / `send_media`
 * tools plus the `/image` `/video` slash commands, backed by pluggable
 * generation providers (Agnes presets + OpenAI-compatible custom entries).
 * Generation is synchronous: media lands in the tool result / the woken
 * agent's reply (markdown image lines), so it shows up inside the AI's own
 * turn. The browser half (`./client`) renders rich tool rows, the message
 * gallery fill, and the Plugins-page configuration card.
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config, type Config as MediaStudioConfig } from './config.js';
export declare const name = "media-studio";
export declare const inject: string[];
export { Config };
export type { MediaStudioConfig };
export type { MediaModelEntry, MediaItemMeta, MediaResultMeta } from './types.js';
export declare function apply(ctx: Context, config: MediaStudioConfig): void;
