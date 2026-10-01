/**
 * @gw/dsh-media-studio — DeepSeek Harness plugin.
 *
 * Host half: registers `generate_image` / `generate_video` / `send_media`
 * tools plus the `/image` `/video` slash commands, backed by pluggable
 * generation providers (Agnes presets + OpenAI-compatible custom entries).
 * Generated media is auto-saved to the output directory and delivered to the
 * chat (inline image gallery; video file + playable path), while the browser
 * half (`./client`) renders rich tool rows and command rows with preview,
 * download, and save-as actions.
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config, type Config as MediaStudioConfig } from './config.js';
export declare const name = "media-studio";
export declare const inject: string[];
export { Config };
export type { MediaStudioConfig };
export type { MediaModelEntry, MediaItemMeta, MediaResultMeta, CommandMediaPayload } from './types.js';
export declare function apply(ctx: Context, config: MediaStudioConfig): void;
