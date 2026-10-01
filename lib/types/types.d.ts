/**
 * Shared value and presentation types for the dsh-media-studio host plugin and
 * its web client half. Everything here is lossless JSON (canonical tool
 * values, `output.presentationMeta` payloads, and the slash-command payload),
 * so both sides can consume it without importing each other's runtime code.
 */
/** Provider adapter id bound to a model entry. */
export type MediaProvider = 'agnes' | 'openai' | 'openai-videos';
/** One configured generation model (preset, or added by the user through config / settings). */
export interface MediaModelEntry {
    /** Stable entry id used by tool arguments and `defaultImageModel` / `defaultVideoModel`. */
    id: string;
    /** Human label for the settings form and result text. */
    label: string;
    /** Provider adapter. `agnes` covers Agnes image + video quirks; `openai` is OpenAI-compatible images; `openai-videos` is the OpenAI Videos-style async API. */
    provider: MediaProvider;
    /** Provider model name, e.g. `agnes-image-2.5-flash`. */
    model: string;
    /** OpenAI-style base URL including the `/v1` suffix when the provider requires it. */
    baseURL: string;
    /** POSIX environment variable name holding the API key (credential reference). */
    apiKeyEnv: string;
}
/**
 * One produced or sent media file. The same shape feeds canonical tool values,
 * `presentationMeta`, and the slash-command payload, so the web client always
 * renders from one projection. (A type alias — not an interface — so the
 * object stays structurally assignable to lossless `JsonValue` payloads.)
 */
export type MediaItemMeta = {
    kind: 'image' | 'video' | 'file';
    /** Display name (basename only; never a path). */
    name: string;
    /** Absolute host path of the auto-saved copy (or the source file for `send_media`). */
    path?: string;
    bytes: number;
    mediaType?: string;
    width?: number;
    height?: number;
    /** Set when the bytes were committed as a durable image attachment (images only). */
    attachmentId?: string;
};
/** `output.presentationMeta` payload shared by all three tools. */
export type MediaResultMeta = {
    items: MediaItemMeta[];
};
/** Canonical tool value: image generation. */
export interface ImageGenerationValue {
    kind: 'image-generation';
    status: 'started' | 'completed';
    /** Present only for the background branch (`run_in_background: true`). */
    jobId?: string;
    prompt: string;
    model: string;
    provider: MediaProvider;
    images: MediaItemMeta[];
}
/** Canonical tool value: video generation. */
export interface VideoGenerationValue {
    kind: 'video-generation';
    status: 'started' | 'completed';
    jobId?: string;
    prompt: string;
    model: string;
    provider: MediaProvider;
    videos: MediaItemMeta[];
}
/** Canonical tool value: sending existing local files into the chat. */
export interface MediaSendValue {
    kind: 'media-send';
    caption?: string;
    files: MediaItemMeta[];
}
/** JSON payload appended to `/image` `/video` command results for the rich command row. */
export interface CommandMediaPayload {
    v: 1;
    kind: 'image' | 'video';
    text: string;
    items: MediaItemMeta[];
}
/** Marker framing the command payload inside `CommandResult.text`. */
export declare const COMMAND_PAYLOAD_OPEN = "\u27E8media-studio\u27E9";
/** Marker framing the command payload inside `CommandResult.text`. */
export declare const COMMAND_PAYLOAD_CLOSE = "\u27E8/media-studio\u27E9";
/** Frame one payload for `CommandResult.text`. */
export declare function encodeCommandPayload(payload: CommandMediaPayload): string;
/** Recover the payload from a recorded `CommandNode.outcome.text`, if present. */
export declare function decodeCommandPayload(text: string | undefined): CommandMediaPayload | undefined;
/** Strip the payload marker from a command result so fallback rows stay readable. */
export declare function stripCommandPayload(text: string | undefined): string;
