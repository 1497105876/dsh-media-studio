/**
 * Preset model catalog. Users may edit, replace, or extend these lists in the
 * plugin config (Settings → Plugins → media-studio, or the profile
 * `cordis.patch.yml`): an entry only needs `baseURL + apiKeyEnv + model`.
 */
import type { MediaModelEntry } from './types.js'

/** Preset image models offered out of the box. */
export const PRESET_IMAGE_MODELS: readonly MediaModelEntry[] = [
  {
    id: 'agnes-image',
    label: 'Agnes agnes-image-2.5-flash（当前免费，支持图生图/多图）',
    provider: 'agnes',
    model: 'agnes-image-2.5-flash',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    apiKeyEnv: 'AGNES_API_KEY',
  },
  {
    id: 'gpt-image',
    label: 'OpenAI gpt-image-1',
    provider: 'openai',
    model: 'gpt-image-1',
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  {
    id: 'nano-banana',
    label: 'Google Gemini 2.5 flash image（nano banana，OpenAI 兼容端点）',
    provider: 'openai',
    model: 'gemini-2.5-flash-image',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnv: 'GEMINI_API_KEY',
  },
  {
    id: 'kolors',
    label: '硅基流动 Kolors（国内直连）',
    provider: 'openai',
    model: 'Kwai-Kolors/Kolors',
    baseURL: 'https://api.siliconflow.cn/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
  },
  {
    id: 'flux-schnell',
    label: '硅基流动 FLUX.1-schnell',
    provider: 'openai',
    model: 'black-forest-labs/FLUX.1-schnell',
    baseURL: 'https://api.siliconflow.cn/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
  },
  {
    id: 'wanx',
    label: '阿里云百炼 万相 wanx2.1-t2i-turbo',
    provider: 'openai',
    model: 'wanx2.1-t2i-turbo',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
]

/** Preset video models offered out of the box. */
export const PRESET_VIDEO_MODELS: readonly MediaModelEntry[] = [
  {
    id: 'agnes-video',
    label: 'Agnes agnes-video-2.5-flash（当前免费，720P）',
    provider: 'agnes',
    model: 'agnes-video-2.5-flash',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    apiKeyEnv: 'AGNES_API_KEY',
  },
  {
    id: 'agnes-video-25',
    label: 'Agnes agnes-video-2.5（720P–2K）',
    provider: 'agnes',
    model: 'agnes-video-2.5',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    apiKeyEnv: 'AGNES_API_KEY',
  },
  {
    id: 'sora-2',
    label: 'OpenAI Sora 2（OpenAI Videos 风格异步接口）',
    provider: 'openai-videos',
    model: 'sora-2',
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
]
