/**
 * Preset model catalog. Users may edit, replace, or extend these lists in the
 * plugin config (Settings → Plugins → media-studio, or the profile
 * `cordis.patch.yml`): an entry only needs `baseURL + apiKeyEnv + model`.
 */
import type { MediaModelEntry } from './types.js';
/** Preset image models offered out of the box. */
export declare const PRESET_IMAGE_MODELS: readonly MediaModelEntry[];
/** Preset video models offered out of the box. */
export declare const PRESET_VIDEO_MODELS: readonly MediaModelEntry[];
