/**
 * Plugin configuration. All user-facing knobs are `volatile` so they appear in
 * the DSH Settings form and persist to the profile `cordis.patch.yml`; API keys
 * themselves are never stored here — each model entry references a POSIX
 * environment variable name (`role('credential-ref')`), resolved through
 * `ctx.credentials` at call time.
 */
import type { Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type { MediaModelEntry } from './types.js';
export type { MediaModelEntry } from './types.js';
export interface Config {
    /** Image generation model catalog (presets + user-added entries). */
    imageModels: Volatile<MediaModelEntry[]>;
    /** Video generation model catalog (presets + user-added entries). */
    videoModels: Volatile<MediaModelEntry[]>;
    /** Entry id used when a tool call omits `model`. */
    defaultImageModel: Volatile<string>;
    /** Entry id used when a tool call omits `model`. */
    defaultVideoModel: Volatile<string>;
    /** Auto-save directory for generated media. Relative paths resolve against the session working directory. */
    outputDir: Volatile<string>;
    /** Write every generated file to `outputDir` (the "download one copy automatically" behavior). */
    autoSave: Volatile<boolean>;
    /** Default image resolution tier (Agnes-style; mapped to pixels for other providers). */
    imageResolution: Volatile<'1K' | '2K' | '3K' | '4K'>;
    /** Default image aspect ratio. */
    imageAspectRatio: Volatile<string>;
    /** Default video duration in seconds (Agnes accepts 4–12). */
    videoSeconds: Volatile<number>;
    /** Default video size tier. */
    videoSize: Volatile<'720P' | '1080P' | '1K' | '2K'>;
    /** Default video aspect ratio. */
    videoAspectRatio: Volatile<string>;
    /** HTTP timeout for generation requests (ms). */
    requestTimeoutMs: number;
    /** Video task polling interval (ms). */
    videoPollIntervalMs: number;
    /** Video task polling budget (ms). */
    videoPollTimeoutMs: number;
}
export declare const Config: Schema<Config>;
