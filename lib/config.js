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
});
