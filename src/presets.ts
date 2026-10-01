/**
 * 默认模型清单：只内置 Agnes（有免费额度，开箱即用）。
 * 其他服务商（OpenAI、Gemini、硅基流动、阿里百炼、Sora 2……）不预置，
 * 用户在设置卡片里自己加条目即可——只需要 provider + model + baseURL + apiKeyEnv
 * 四个字段，README 里有常见服务商的参考配置。
 */
import type { MediaModelEntry } from './types.js'

/** 默认图片模型。 */
export const PRESET_IMAGE_MODELS: readonly MediaModelEntry[] = [
  {
    id: 'agnes-image',
    label: 'Agnes 生图（免费，支持图生图/多图）',
    provider: 'agnes',
    model: 'agnes-image-2.5-flash',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    apiKeyEnv: 'AGNES_API_KEY',
  },
]

/** 默认视频模型。 */
export const PRESET_VIDEO_MODELS: readonly MediaModelEntry[] = [
  {
    id: 'agnes-video',
    label: 'Agnes 生视频（免费）',
    provider: 'agnes',
    model: 'agnes-video-2.5-flash',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    apiKeyEnv: 'AGNES_API_KEY',
  },
]
