/** 默认图片模型。 */
export const PRESET_IMAGE_MODELS = [
    {
        id: 'agnes-image',
        label: 'Agnes 生图（免费，支持图生图/多图）',
        provider: 'agnes',
        model: 'agnes-image-2.5-flash',
        baseURL: 'https://apihub.agnes-ai.com/v1',
        apiKeyEnv: 'AGNES_API_KEY',
    },
];
/** 默认视频模型。 */
export const PRESET_VIDEO_MODELS = [
    {
        id: 'agnes-video',
        label: 'Agnes 生视频（免费）',
        provider: 'agnes',
        model: 'agnes-video-2.5-flash',
        baseURL: 'https://apihub.agnes-ai.com/v1',
        apiKeyEnv: 'AGNES_API_KEY',
    },
];
