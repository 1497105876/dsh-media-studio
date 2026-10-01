/**
 * Media storage helpers: auto-save copies ("download one copy automatically"),
 * durable image attachments for inline chat display, and reference-image
 * loading for image-to-image.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, extname, isAbsolute, join, resolve } from 'node:path'
import type { AttachmentStore, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { ReferenceImage } from './providers.js'
import type { MediaItemMeta } from './types.js'

/** Extensions the attachment service accepts as raster images. */
const IMAGE_EXTENSIONS: Readonly<Record<string, ImageMediaType>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** Identify a supported image media type from the file signature. */
export function sniffImageMediaType(data: Uint8Array): ImageMediaType | undefined {
  const ascii = (offset: number, value: string): boolean => {
    for (let index = 0; index < value.length; index += 1) {
      if (data[offset + index] !== value.charCodeAt(index)) return false
    }
    return true
  }
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'image/png'
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (ascii(0, 'GIF87a') || ascii(0, 'GIF89a')) return 'image/gif'
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'image/webp'
  return undefined
}

/** Map a path to a supported image media type by extension. */
export function imageMediaTypeForPath(path: string): ImageMediaType | undefined {
  return IMAGE_EXTENSIONS[extname(path).toLowerCase()]
}

/** Encode bytes as a `data:` URI for providers that take inline reference images. */
export function toDataUri(bytes: Uint8Array, mediaType: string): string {
  return `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`
}

/**
 * Resolve one tool-supplied reference image: http(s) URLs and data URIs pass
 * through; anything else is read from disk and inlined as a data URI (Agnes
 * only accepts public URLs or data URIs).
 */
export async function readReferenceImage(input: string): Promise<ReferenceImage> {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return { url: trimmed }
  if (/^data:/i.test(trimmed)) return { dataUri: trimmed }
  const path = isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed)
  const bytes = new Uint8Array(await readFile(path))
  const mediaType = imageMediaTypeForPath(path) ?? sniffImageMediaType(bytes) ?? 'image/png'
  return { dataUri: toDataUri(bytes, mediaType) }
}

/**
 * Resolve the auto-save directory. `~` / `~/...` expands to the user home, so
 * the default `~/.dsh/media-studio` lands next to the dsh profile whatever the
 * OS account is; relative paths resolve against the session working directory.
 */
export function resolveOutputDir(outputDir: string, cwd: string | undefined): string {
  const raw = outputDir.trim()
  const expanded = raw === '~' || raw.startsWith('~/') || raw.startsWith('~\\')
    ? join(homedir(), raw.slice(1))
    : raw
  return isAbsolute(expanded) ? expanded : resolve(cwd ?? process.cwd(), expanded)
}

/** Timestamped, collision-resistant media file name. */
export function uniqueMediaName(prefix: string, extension: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${stamp}-${suffix}${extension.startsWith('.') ? extension : `.${extension}`}`
}

async function writeOutputFile(outputDir: string, name: string, bytes: Uint8Array): Promise<string> {
  await mkdir(outputDir, { recursive: true })
  const path = join(outputDir, name)
  await writeFile(path, bytes)
  return path
}

export interface CommitOptions {
  name: string
  bytes: Uint8Array
  outputDir: string
  /** Write the auto-saved copy into `outputDir`. Videos ignore this and always write (playback needs a file path). */
  autoSave: boolean
}

/**
 * Commit one generated image: optional auto-save copy plus a durable image
 * attachment (the inline display currency of the chat UI).
 */
export async function commitImage(
  attachments: AttachmentStore,
  options: CommitOptions & { mediaType: ImageMediaType },
): Promise<MediaItemMeta> {
  const ref = await attachments.saveImage({
    data: options.bytes,
    mediaType: options.mediaType,
    name: basename(options.name),
  })
  let path: string | undefined
  if (options.autoSave) {
    path = await writeOutputFile(options.outputDir, basename(options.name), options.bytes)
  }
  return {
    kind: 'image',
    name: ref.name ?? basename(options.name),
    ...(path === undefined ? {} : { path }),
    bytes: ref.bytes,
    mediaType: ref.mediaType,
    width: ref.width,
    height: ref.height,
    attachmentId: ref.attachmentId as string,
  }
}

/** Commit one generated video: always written to disk (the chat player streams it from the path). */
export async function commitVideo(options: CommitOptions): Promise<MediaItemMeta> {
  const path = await writeOutputFile(options.outputDir, basename(options.name), options.bytes)
  return {
    kind: 'video',
    name: basename(options.name),
    path,
    bytes: options.bytes.byteLength,
    mediaType: 'video/mp4',
  }
}

/** Describe one existing local file without copying it. */
export async function describeLocalFile(path: string): Promise<MediaItemMeta> {
  const bytes = new Uint8Array(await readFile(path))
  const mediaType = imageMediaTypeForPath(path) ?? sniffImageMediaType(bytes)
  const extension = extname(path).toLowerCase()
  const kind: MediaItemMeta['kind'] = mediaType !== undefined
    ? 'image'
    : ['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(extension)
      ? 'video'
      : 'file'
  return {
    kind,
    name: basename(path),
    path,
    bytes: bytes.byteLength,
    ...(mediaType === undefined ? {} : { mediaType }),
  }
}
