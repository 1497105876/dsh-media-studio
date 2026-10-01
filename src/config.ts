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
  /**
   * Auto-save directory for generated media. `~` expands to the user home
   * (default `~/.dsh/media-studio`); relative paths resolve against the
   * session working directory.
   */
  outputDir: Volatile<string>
  /** Write every generated image to `outputDir` (videos always land there). */
  autoSave: Volatile<boolean>
  /** Default image resolution tier (1K–4K) or any provider-specific size string. */
  imageResolution: Volatile<string>
  /** Default image aspect ratio, e.g. `16:9`. */
  imageAspectRatio: Volatile<string>
  /** Default video duration in seconds (Agnes accepts 4–12). */
  videoSeconds: Volatile<number>
  /** Default video size tier (720P/1080P/1K/2K) or any provider-specific size string. */
  videoSize: Volatile<string>
  /** Default video aspect ratio. */
  videoAspectRatio: Volatile<string>
  /** HTTP timeout for generation requests (ms). */
  requestTimeoutMs: Volatile<number>
  /** Video task polling interval (ms). */
  videoPollIntervalMs: Volatile<number>
  /** Video task polling budget (ms). */
  videoPollTimeoutMs: Volatile<number>
}

export const Config: Schema<Config> = Schema.object({
  imageModels: Schema.array(modelEntrySchema).default([...PRESET_IMAGE_MODELS]).volatile(),
  videoModels: Schema.array(modelEntrySchema).default([...PRESET_VIDEO_MODELS]).volatile(),
  defaultImageModel: Schema.string().default('agnes-image').volatile(),
  defaultVideoModel: Schema.string().default('agnes-video').volatile(),
  outputDir: Schema.string().default('~/.dsh/media-studio').volatile(),
  autoSave: Schema.boolean().default(true).volatile(),
  // 分辨率/尺寸/画幅放开成自由字符串：设置卡片是可下拉的输入框，常见档位点选，
  // 服务商支持的其他档位（如具体像素）也允许手输。
  imageResolution: Schema.string().default('2K').volatile(),
  imageAspectRatio: Schema.string().default('16:9').volatile(),
  videoSeconds: Schema.number().step(1).min(4).max(12).default(5).volatile(),
  videoSize: Schema.string().default('720P').volatile(),
  videoAspectRatio: Schema.string().default('16:9').volatile(),
  requestTimeoutMs: Schema.number().default(300_000).volatile(),
  videoPollIntervalMs: Schema.number().default(2_000).volatile(),
  videoPollTimeoutMs: Schema.number().default(900_000).volatile(),
}) as unknown as Schema<Config>
