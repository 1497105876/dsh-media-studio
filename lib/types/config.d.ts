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
    /**
     * Auto-save directory for generated media. `~` expands to the user home
     * (default `~/.dsh/media-studio`); relative paths resolve against the
     * session working directory.
     */
    outputDir: Volatile<string>;
    /** Write every generated image to `outputDir` (videos always land there). */
    autoSave: Volatile<boolean>;
    /** Default image resolution tier (1K–4K) or any provider-specific size string. */
    imageResolution: Volatile<string>;
    /** Default image aspect ratio, e.g. `16:9`. */
    imageAspectRatio: Volatile<string>;
    /** Default video duration in seconds (Agnes accepts 4–12). */
    videoSeconds: Volatile<number>;
    /** Default video size tier (720P/1080P/1K/2K) or any provider-specific size string. */
    videoSize: Volatile<string>;
    /** Default video aspect ratio. */
    videoAspectRatio: Volatile<string>;
    /** HTTP timeout for generation requests (ms). */
    requestTimeoutMs: Volatile<number>;
    /** Video task polling interval (ms). */
    videoPollIntervalMs: Volatile<number>;
    /** Video task polling budget (ms). */
    videoPollTimeoutMs: Volatile<number>;
}
export declare const Config: Schema<Config>;
