import Schema from '@deepseek-ai/schemastery';
import { PRESET_IMAGE_MODELS, PRESET_VIDEO_MODELS } from './presets.js';
/** One model row in the settings form / config file. */
const modelEntrySchema = Schema.object({
    id: Schema.string().required(),
    label: Schema.string().default(''),
    provider: Schema.union(['agnes', 'openai', 'openai-videos']).default('agnes'),
    model: Schema.string().required(),
    baseURL: Schema.string().required(),
    apiKeyEnv: Schema.string().role('credential-ref').default(''),
});
export const Config = Schema.object({
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
});
