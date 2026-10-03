/**
 * Slash commands: `/image <prompt>` and `/video <prompt>`.
 *
 * Commands are synchronous: media renders inline in the command card from the
 * result payload (image gallery / video player with download + system open).
 * There is deliberately no background mode — completion pushes would have to
 * ride the user-message channel, which impersonates the user; media instead
 * shows up as the AI's own tool result.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.js';
/** Register `/image` and `/video`. */
export declare function registerMediaCommands(ctx: Context, config: Config): void;
