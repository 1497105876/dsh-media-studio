/**
 * Slash commands: `/image <prompt>` and `/video <prompt>`.
 *
 * Default behavior is background generation with a chat push on completion
 * (matching the tool flow). Prefix the prompt with `--wait` to run
 * synchronously — the command row then renders the media inline (image
 * gallery / video player with download + save-as) from the result payload.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.js';
/** Register `/image` and `/video`. */
export declare function registerMediaCommands(ctx: Context, config: Config): void;
