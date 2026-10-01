/**
 * Provider adapters. Three shapes cover the shipped presets:
 *  - `agnes`         — Agnes AI images (`/images/generations` with their
 *                      `extra_body` quirks) and videos (`/v1/videos` submit +
 *                      `/agnesapi` polling), incl. image-to-image and
 *                      keyframe/reference video modes.
 *  - `openai`        — OpenAI-compatible image generation / edits
 *                      (`/images/generations`, multipart `/images/edits`).
 *  - `openai-videos` — OpenAI Videos-style async API (`/videos` submit +
 *                      `/videos/{id}` polling).
 */
import type { MediaModelEntry } from './types.js';
/** One reference image for image-to-image / video reference modes. */
export interface ReferenceImage {
    /** Public https URL, mutually exclusive with `dataUri`. */
    url?: string;
    /** `data:<mediaType>;base64,....` string, mutually exclusive with `url`. */
    dataUri?: string;
}
export interface ImageGenerationParams {
    prompt: string;
    /** Resolution tier: `1K` / `2K` / `3K` / `4K`. */
    resolution: string;
    /** Aspect ratio, e.g. `16:9`. */
    aspectRatio: string;
    referenceImages: readonly ReferenceImage[];
    signal: AbortSignal;
    timeoutMs: number;
}
export interface GeneratedImage {
    bytes: Uint8Array;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
}
export interface VideoGenerationParams {
    prompt: string;
    seconds: number;
    /** Size tier: `720P` / `1080P` / `1K` / `2K`. */
    size: string;
    aspectRatio: string;
    mode: 'text' | 'keyframe' | 'reference';
    firstFrame?: ReferenceImage;
    lastFrame?: ReferenceImage;
    referenceImages: readonly ReferenceImage[];
    signal: AbortSignal;
    timeoutMs: number;
    pollIntervalMs: number;
    pollTimeoutMs: number;
    /** Progress line sink for background jobs. */
    onProgress?: (line: string) => void;
}
export interface GeneratedVideo {
    bytes: Uint8Array;
    mediaType: 'video/mp4';
}
/** Generate one image through the entry's provider adapter. */
export declare function generateImage(entry: MediaModelEntry, apiKey: string, params: ImageGenerationParams): Promise<GeneratedImage>;
/** Decode a `data:...;base64,...` URI into bytes. */
export declare function decodeDataUri(dataUri: string): {
    bytes: Uint8Array;
    mediaType: string;
};
/** Generate one video: submit an async task, poll to completion, download the result. */
export declare function generateVideo(entry: MediaModelEntry, apiKey: string, params: VideoGenerationParams): Promise<GeneratedVideo>;
