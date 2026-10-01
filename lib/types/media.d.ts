import type { AttachmentStore, ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { ReferenceImage } from './providers.js';
import type { MediaItemMeta } from './types.js';
/** Identify a supported image media type from the file signature. */
export declare function sniffImageMediaType(data: Uint8Array): ImageMediaType | undefined;
/** Map a path to a supported image media type by extension. */
export declare function imageMediaTypeForPath(path: string): ImageMediaType | undefined;
/** Encode bytes as a `data:` URI for providers that take inline reference images. */
export declare function toDataUri(bytes: Uint8Array, mediaType: string): string;
/**
 * Resolve one tool-supplied reference image: http(s) URLs and data URIs pass
 * through; anything else is read from disk and inlined as a data URI (Agnes
 * only accepts public URLs or data URIs).
 */
export declare function readReferenceImage(input: string): Promise<ReferenceImage>;
/**
 * Resolve the auto-save directory. `~` / `~/...` expands to the user home, so
 * the default `~/.dsh/media-studio` lands next to the dsh profile whatever the
 * OS account is; relative paths resolve against the session working directory.
 */
export declare function resolveOutputDir(outputDir: string, cwd: string | undefined): string;
/** Timestamped, collision-resistant media file name. */
export declare function uniqueMediaName(prefix: string, extension: string): string;
export interface CommitOptions {
    name: string;
    bytes: Uint8Array;
    outputDir: string;
    /** Write the auto-saved copy into `outputDir`. Videos ignore this and always write (playback needs a file path). */
    autoSave: boolean;
}
/**
 * Commit one generated image: optional auto-save copy plus a durable image
 * attachment (the inline display currency of the chat UI).
 */
export declare function commitImage(attachments: AttachmentStore, options: CommitOptions & {
    mediaType: ImageMediaType;
}): Promise<MediaItemMeta>;
/** Commit one generated video: always written to disk (the chat player streams it from the path). */
export declare function commitVideo(options: CommitOptions): Promise<MediaItemMeta>;
/** Describe one existing local file without copying it. */
export declare function describeLocalFile(path: string): Promise<MediaItemMeta>;
