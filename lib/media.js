/**
 * Media storage helpers: auto-save copies ("download one copy automatically"),
 * durable image attachments for inline chat display, and reference-image
 * loading for image-to-image.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';
/** Extensions the attachment service accepts as raster images. */
const IMAGE_EXTENSIONS = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};
/** Identify a supported image media type from the file signature. */
export function sniffImageMediaType(data) {
    const ascii = (offset, value) => {
        for (let index = 0; index < value.length; index += 1) {
            if (data[offset + index] !== value.charCodeAt(index))
                return false;
        }
        return true;
    };
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47)
        return 'image/png';
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
        return 'image/jpeg';
    if (ascii(0, 'GIF87a') || ascii(0, 'GIF89a'))
        return 'image/gif';
    if (ascii(0, 'RIFF') && ascii(8, 'WEBP'))
        return 'image/webp';
    return undefined;
}
/** Map a path to a supported image media type by extension. */
export function imageMediaTypeForPath(path) {
    return IMAGE_EXTENSIONS[extname(path).toLowerCase()];
}
/** Encode bytes as a `data:` URI for providers that take inline reference images. */
export function toDataUri(bytes, mediaType) {
    return `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`;
}
/**
 * Resolve one tool-supplied reference image: http(s) URLs and data URIs pass
 * through; anything else is read from disk and inlined as a data URI (Agnes
 * only accepts public URLs or data URIs).
 */
export async function readReferenceImage(input) {
    const trimmed = input.trim();
    if (/^https?:\/\//i.test(trimmed))
        return { url: trimmed };
    if (/^data:/i.test(trimmed))
        return { dataUri: trimmed };
    const path = isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed);
    const bytes = new Uint8Array(await readFile(path));
    const mediaType = imageMediaTypeForPath(path) ?? sniffImageMediaType(bytes) ?? 'image/png';
    return { dataUri: toDataUri(bytes, mediaType) };
}
/** Resolve the auto-save directory; relative paths resolve against the session working directory. */
export function resolveOutputDir(outputDir, cwd) {
    return isAbsolute(outputDir) ? outputDir : resolve(cwd ?? process.cwd(), outputDir);
}
/** Timestamped, collision-resistant media file name. */
export function uniqueMediaName(prefix, extension) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${stamp}-${suffix}${extension.startsWith('.') ? extension : `.${extension}`}`;
}
async function writeOutputFile(outputDir, name, bytes) {
    await mkdir(outputDir, { recursive: true });
    const path = join(outputDir, name);
    await writeFile(path, bytes);
    return path;
}
/**
 * Commit one generated image: optional auto-save copy plus a durable image
 * attachment (the inline display currency of the chat UI).
 */
export async function commitImage(attachments, options) {
    const ref = await attachments.saveImage({
        data: options.bytes,
        mediaType: options.mediaType,
        name: basename(options.name),
    });
    let path;
    if (options.autoSave) {
        path = await writeOutputFile(options.outputDir, basename(options.name), options.bytes);
    }
    return {
        kind: 'image',
        name: ref.name ?? basename(options.name),
        ...(path === undefined ? {} : { path }),
        bytes: ref.bytes,
        mediaType: ref.mediaType,
        width: ref.width,
        height: ref.height,
        attachmentId: ref.attachmentId,
    };
}
/** Commit one generated video: always written to disk (the chat player streams it from the path). */
export async function commitVideo(options) {
    const path = await writeOutputFile(options.outputDir, basename(options.name), options.bytes);
    return {
        kind: 'video',
        name: basename(options.name),
        path,
        bytes: options.bytes.byteLength,
        mediaType: 'video/mp4',
    };
}
/** Describe one existing local file without copying it. */
export async function describeLocalFile(path) {
    const bytes = new Uint8Array(await readFile(path));
    const mediaType = imageMediaTypeForPath(path) ?? sniffImageMediaType(bytes);
    const extension = extname(path).toLowerCase();
    const kind = mediaType !== undefined
        ? 'image'
        : ['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(extension)
            ? 'video'
            : 'file';
    return {
        kind,
        name: basename(path),
        path,
        bytes: bytes.byteLength,
        ...(mediaType === undefined ? {} : { mediaType }),
    };
}
