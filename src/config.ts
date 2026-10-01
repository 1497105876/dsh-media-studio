/**
 * Plugin configuration. All user-facing knobs are `volatile` so they appear in
 * the DSH Settings form and persist to the profile `cordis.patch.yml`; API keys
 * themselves are never stored here — each model entry references a POSIX
 * environment variable name (`role('credential-ref')`), resolved through
 * `ctx.credentials` at call time.
 */
import type { Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { PRESET_IMAGE_MODELS, PRESET_VIDEO_MODELS } from './presets.js'
import type { MediaModelEntry } from './types.js'

export type { MediaModelEntry } from './types.js'

/** One model row in the settings form / config file. */
const modelEntrySchema = Schema.object({
  id: Schema.string().required(),
  label: Schema.string().default(''),
  provider: Schema.union(['agnes', 'openai', 'openai-videos']).default('agnes'),
  model: Schema.string().required(),
  baseURL: Schema.string().required(),
  apiKeyEnv: Schema.string().role('credential-ref').default(''),
})

export interface Config {
  /** Image generation model catalog (presets + user-added entries). */
  imageModels: Volatile<MediaModelEntry[]>
  /** Video generation model catalog (presets + user-added entries). */
  videoModels: Volatile<MediaModelEntry[]>
  /** Entry id used when a tool call omits `model`. */
  defaultImageModel: Volatile<string>
  /** Entry id used when a tool call omits `model`. */
  defaultVideoModel: Volatile<string>
  /** Auto-save directory for generated media. Relative paths resolve against the session working directory. */
  outputDir: Volatile<string>
  /** Write every generated file to `outputDir` (the "download one copy automatically" behavior). */
  autoSave: Volatile<boolean>
  /** Default image resolution tier (Agnes-style; mapped to pixels for other providers). */
  imageResolution: Volatile<'1K' | '2K' | '3K' | '4K'>
  /** Default image aspect ratio. */
  imageAspectRatio: Volatile<string>
  /** Default video duration in seconds (Agnes accepts 4–12). */
  videoSeconds: Volatile<number>
  /** Default video size tier. */
  videoSize: Volatile<'720P' | '1080P' | '1K' | '2K'>
  /** Default video aspect ratio. */
  videoAspectRatio: Volatile<string>
  /** HTTP timeout for generation requests (ms). */
  requestTimeoutMs: number
  /** Video task polling interval (ms). */
  videoPollIntervalMs: number
  /** Video task polling budget (ms). */
  videoPollTimeoutMs: number
}

export const Config: Schema<Config> = Schema.object({
  imageModels: Schema.array(modelEntrySchema).default([...PRESET_IMAGE_MODELS]).volatile(),
  videoModels: Schema.array(modelEntrySchema).default([...PRESET_VIDEO_MODELS]).volatile(),
  defaultImageModel: Schema.string().default('agnes-image').volatile(),
  defaultVideoModel: Schema.string().default('agnes-video').volatile(),
  outputDir: Schema.string().default('media-output').volatile(),
  autoSave: Schema.boolean().default(true).volatile(),
  imageResolution: Schema.union(['1K', '2K', '3K', '4K']).default('2K').volatile(),
  imageAspectRatio: Schema.union(['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9']).default('16:9').volatile(),
  videoSeconds: Schema.number().step(1).min(4).max(12).default(5).volatile(),
  videoSize: Schema.union(['720P', '1080P', '1K', '2K']).default('720P').volatile(),
  videoAspectRatio: Schema.union(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']).default('16:9').volatile(),
  requestTimeoutMs: Schema.number().default(300_000),
  videoPollIntervalMs: Schema.number().default(2_000),
  videoPollTimeoutMs: Schema.number().default(900_000),
}) as unknown as Schema<Config>
