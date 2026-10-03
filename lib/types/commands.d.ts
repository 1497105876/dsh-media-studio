/**
 * Slash commands: `/image <prompt>` and `/video <prompt>`.
 *
 * Commands return immediately (the card shows "生成中…", nothing blocks);
 * the finished media is delivered by waking the agent, whose reply carries
 * the markdown image lines — the picture ends up inside the AI's message
 * (see instructions.ts). No user-bubble impersonation, no collapsed cards.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.js';
/** Register `/image` and `/video`. */
export declare function registerMediaCommands(ctx: Context, config: Config): void;
