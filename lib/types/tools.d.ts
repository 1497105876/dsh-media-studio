/**
 * Model-facing tools: `generate_image`, `generate_video`, `send_media`.
 *
 * Every tool returns one canonical JSON value (`output.schema`), renders model
 * content from it (`output.render` — image blocks are legal tool-result
 * content), and projects replayable UI metadata (`output.presentationMeta`)
 * that the web client half turns into an inline gallery / video player with
 * download and save-as actions.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import type { Config } from './config.js';
import type { CommandMediaPayload, MediaItemMeta, MediaModelEntry } from './types.js';
/** Resolve a model entry by id (falling back to the configured default). */
export declare function resolveModel(entries: readonly MediaModelEntry[], defaultId: string, requested: string | undefined, kind: 'image' | 'video'): MediaModelEntry;
/** Resolve the API key through the credential seam, then plain environment. */
export declare function resolveApiKey(ctx: Context, entry: MediaModelEntry): Promise<string>;
/** Build the chat push content for finished images. The trailing instruction
 *  makes the woken agent surface the files itself: completion notices ride the
 *  followup/inject channel, which feeds the model but renders no content, so
 *  the only way media shows up in the conversation is a tool row (send_media). */
export declare function buildImagePushContent(headline: string, images: readonly MediaItemMeta[]): ContentBlock[];
/** Build the chat push content for a finished video. */
export declare function buildVideoPushContent(headline: string, videos: readonly MediaItemMeta[]): ContentBlock[];
/** Register the three media tools. */
export declare function registerMediaTools(ctx: Context, config: Config): void;
/** Payload projection shared with the slash commands. */
export declare function mediaPayload(kind: 'image' | 'video', text: string, items: readonly MediaItemMeta[]): CommandMediaPayload;
