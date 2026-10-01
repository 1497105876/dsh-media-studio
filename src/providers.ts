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
import type { MediaModelEntry } from './types.js'

/** One reference image for image-to-image / video reference modes. */
export interface ReferenceImage {
  /** Public https URL, mutually exclusive with `dataUri`. */
  url?: string
  /** `data:<mediaType>;base64,....` string, mutually exclusive with `url`. */
  dataUri?: string
}

export interface ImageGenerationParams {
  prompt: string
  /** Resolution tier: `1K` / `2K` / `3K` / `4K`. */
  resolution: string
  /** Aspect ratio, e.g. `16:9`. */
  aspectRatio: string
  referenceImages: readonly ReferenceImage[]
  signal: AbortSignal
  timeoutMs: number
}

export interface GeneratedImage {
  bytes: Uint8Array
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp'
}

export interface VideoGenerationParams {
  prompt: string
  seconds: number
  /** Size tier: `720P` / `1080P` / `1K` / `2K`. */
  size: string
  aspectRatio: string
  mode: 'text' | 'keyframe' | 'reference'
  firstFrame?: ReferenceImage
  lastFrame?: ReferenceImage
  referenceImages: readonly ReferenceImage[]
  signal: AbortSignal
  timeoutMs: number
  pollIntervalMs: number
  pollTimeoutMs: number
  /** Progress line sink for background jobs. */
  onProgress?: (line: string) => void
}

export interface GeneratedVideo {
  bytes: Uint8Array
  mediaType: 'video/mp4'
}

/** Agnes aspect-ratio × resolution-tier → pixel size (official size table). */
const AGNES_SIZE_TABLE: Readonly<Record<string, Readonly<Record<string, [number, number]>>>> = {
  '1:1': { '1K': [1024, 1024], '2K': [2048, 2048], '3K': [3072, 3072], '4K': [4096, 4096] },
  '3:4': { '1K': [864, 1152], '2K': [1728, 2304], '3K': [2304, 3072], '4K': [3072, 4096] },
  '4:3': { '1K': [1152, 864], '2K': [2304, 1728], '3K': [3072, 2304], '4K': [4096, 3072] },
  '16:9': { '1K': [1312, 736], '2K': [2624, 1472], '3K': [3936, 2208], '4K': [5248, 2944] },
  '9:16': { '1K': [736, 1312], '2K': [1472, 2624], '3K': [2208, 3936], '4K': [2944, 5248] },
  '2:3': { '1K': [832, 1248], '2K': [1664, 2496], '3K': [2304, 3456], '4K': [3072, 4608] },
  '3:2': { '1K': [1248, 832], '2K': [2496, 1664], '3K': [3456, 2304], '4K': [4608, 3072] },
  '21:9': { '1K': [1568, 672], '2K': [3136, 1344], '3K': [4704, 2016], '4K': [6272, 2688] },
}

/** Map an aspect ratio to the pixel size OpenAI-compatible image endpoints accept. */
function openAiSizeFor(aspectRatio: string): string {
  const table = AGNES_SIZE_TABLE[aspectRatio] ?? AGNES_SIZE_TABLE['1:1']
  const [w, h] = table['1K']
  if (w === h) return '1024x1024'
  return w > h ? '1536x1024' : '1024x1536'
}

/** Combine our timeout budget with the caller's cancellation signal. */
function linkSignal(signal: AbortSignal, timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = AbortSignal.any([signal, timeout])
  return { signal: combined, dispose: () => undefined }
}

async function readError(response: Response): Promise<string> {
  let detail = ''
  try {
    detail = (await response.text()).slice(0, 2000)
  } catch { /* ignore */ }
  return `HTTP ${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`
}

async function requestJson(url: string, init: RequestInit, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { ...init, signal })
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${url} failed — ${await readError(response)}`)
  return await response.json() as unknown
}

async function fetchBytes(url: string, signal: AbortSignal, hint: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`downloading result failed (${hint}) — ${await readError(response)}`)
  const buffer = new Uint8Array(await response.arrayBuffer())
  return { bytes: buffer, mediaType: response.headers.get('content-type')?.split(';')[0] ?? '' }
}

function referenceImageToApi(ref: ReferenceImage): string {
  if (ref.dataUri !== undefined) return ref.dataUri
  if (ref.url !== undefined) return ref.url
  throw new Error('reference image has neither url nor dataUri')
}

function mediaTypeFromContentType(contentType: string): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'image/jpeg'
  if (contentType.includes('webp')) return 'image/webp'
  return 'image/png'
}

interface ImageResultCandidates {
  b64?: string
  url?: string
}

/** Extract `b64_json` / `url` from OpenAI-style, Agnes, and SiliconFlow-style responses.
 *  Agnes 在 response_format:'url' 时会带占位的空字符串 b64_json:""，
 *  所以 b64 分支必须判非空，否则会拿空串去解码，最后报 "Image is empty."。 */
function extractImageResult(body: unknown): ImageResultCandidates {
  const root = body as Record<string, unknown>
  const pick = (row: unknown): ImageResultCandidates | undefined => {
    const item = row as Record<string, unknown>
    if (typeof item?.b64_json === 'string' && item.b64_json.length > 0) return { b64: item.b64_json }
    if (typeof item?.url === 'string' && item.url.length > 0) return { url: item.url }
    if (typeof item?.image_url === 'string' && item.image_url.length > 0) return { url: item.image_url }
    return undefined
  }
  const data = Array.isArray(root?.data) ? (root.data as unknown[]) : undefined
  if (data && data.length > 0) {
    const found = pick(data[0])
    if (found !== undefined) return found
  }
  const images = Array.isArray(root?.images) ? (root.images as unknown[]) : undefined
  if (images && images.length > 0) {
    const found = pick(images[0])
    if (found !== undefined) return found
  }
  throw new Error(`image response carried no data[0].url / b64_json: ${JSON.stringify(body).slice(0, 500)}`)
}

function decodeBase64Image(b64: string): GeneratedImage {
  const bytes = new Uint8Array(Buffer.from(b64, 'base64'))
  return { bytes, mediaType: mediaTypeFromContentType(guessImageMime(bytes)) }
}

function guessImageMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes[0] === 0x52 && bytes[8] === 0x57) return 'image/webp'
  return 'image/png'
}

/** Generate one image through the entry's provider adapter. */
export async function generateImage(
  entry: MediaModelEntry,
  apiKey: string,
  params: ImageGenerationParams,
): Promise<GeneratedImage> {
  const { signal, dispose } = linkSignal(params.signal, params.timeoutMs)
  try {
    if (entry.provider === 'agnes') return await agnesImage(entry, apiKey, params, signal)
    return await openAiImage(entry, apiKey, params, signal)
  } finally {
    dispose()
  }
}

async function agnesImage(
  entry: MediaModelEntry,
  apiKey: string,
  params: ImageGenerationParams,
  signal: AbortSignal,
): Promise<GeneratedImage> {
  const extraBody: Record<string, unknown> = { response_format: 'url' }
  if (params.referenceImages.length > 0) {
    extraBody.image = params.referenceImages.map(referenceImageToApi)
  }
  const body = await requestJson(`${entry.baseURL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: entry.model,
      prompt: params.prompt,
      size: params.resolution,
      ratio: params.aspectRatio,
      extra_body: extraBody,
    }),
  }, signal)
  const result = extractImageResult(body)
  if (result.b64 !== undefined) return decodeBase64Image(result.b64)
  const downloaded = await fetchBytes(result.url!, signal, entry.model)
  return { bytes: downloaded.bytes, mediaType: mediaTypeFromContentType(downloaded.mediaType) }
}

async function openAiImage(
  entry: MediaModelEntry,
  apiKey: string,
  params: ImageGenerationParams,
  signal: AbortSignal,
): Promise<GeneratedImage> {
  const headers = { Authorization: `Bearer ${apiKey}` }
  let body: unknown
  if (params.referenceImages.length === 0) {
    body = await requestJson(`${entry.baseURL}/images/generations`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: entry.model,
        prompt: params.prompt,
        size: openAiSizeFor(params.aspectRatio),
        n: 1,
      }),
    }, signal)
  } else {
    // Image-to-image goes through the multipart /images/edits endpoint.
    const form = new FormData()
    form.set('model', entry.model)
    form.set('prompt', params.prompt)
    form.set('size', openAiSizeFor(params.aspectRatio))
    form.set('n', '1')
    let index = 0
    for (const ref of params.referenceImages) {
      index += 1
      const { bytes, mediaType } = ref.dataUri !== undefined
        ? decodeDataUri(ref.dataUri)
        : await fetchBytes(ref.url!, signal, `reference ${index}`)
      form.append('image[]', new Blob([bytes], { type: mediaType }), `reference-${index}.png`)
    }
    body = await requestJson(`${entry.baseURL}/images/edits`, {
      method: 'POST',
      headers,
      body: form,
    }, signal)
  }
  const result = extractImageResult(body)
  if (result.b64 !== undefined) return decodeBase64Image(result.b64)
  const downloaded = await fetchBytes(result.url!, signal, entry.model)
  return { bytes: downloaded.bytes, mediaType: mediaTypeFromContentType(downloaded.mediaType) }
}

/** Decode a `data:...;base64,...` URI into bytes. */
export function decodeDataUri(dataUri: string): { bytes: Uint8Array; mediaType: string } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUri)
  if (match === null) throw new Error('invalid data URI')
  const mediaType = match[1] ?? 'application/octet-stream'
  const bytes = match[2] !== undefined
    ? new Uint8Array(Buffer.from(match[3], 'base64'))
    : new Uint8Array(Buffer.from(decodeURIComponent(match[3]), 'utf8'))
  return { bytes, mediaType }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason instanceof Error ? signal.reason : new Error('aborted')); return }
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve() }, ms)
    const onAbort = () => { clearTimeout(timer); reject(signal.reason instanceof Error ? signal.reason : new Error('aborted')) }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** Generate one video: submit an async task, poll to completion, download the result. */
export async function generateVideo(
  entry: MediaModelEntry,
  apiKey: string,
  params: VideoGenerationParams,
): Promise<GeneratedVideo> {
  const { signal, dispose } = linkSignal(params.signal, params.timeoutMs)
  const pollDeadline = Date.now() + params.pollTimeoutMs
  try {
    return entry.provider === 'agnes'
      ? await agnesVideo(entry, apiKey, params, signal, pollDeadline)
      : await openAiVideo(entry, apiKey, params, signal, pollDeadline)
  } finally {
    dispose()
  }
}

async function agnesVideo(
  entry: MediaModelEntry,
  apiKey: string,
  params: VideoGenerationParams,
  signal: AbortSignal,
  pollDeadline: number,
): Promise<GeneratedVideo> {
  const payload: Record<string, unknown> = {
    model: entry.model,
    prompt: params.prompt,
    mode: params.mode,
    // Agnes requires seconds as a STRING ("4"–"12").
    seconds: String(params.seconds),
    size: params.size,
    aspect_ratio: params.aspectRatio,
  }
  if (params.mode === 'keyframe') {
    if (params.firstFrame !== undefined) payload.first_frame = referenceImageToApi(params.firstFrame)
    if (params.lastFrame !== undefined) payload.last_frame = referenceImageToApi(params.lastFrame)
    if (payload.first_frame === undefined && payload.last_frame === undefined) {
      throw new Error('keyframe mode needs at least one of first_frame / last_frame')
    }
  }
  if (params.mode === 'reference') {
    const images = params.referenceImages.map(referenceImageToApi)
    if (images.length === 0) throw new Error('reference mode needs at least one reference image')
    payload.images = images
  }
  const submitted = await requestJson(`${entry.baseURL}/videos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, signal) as Record<string, unknown>
  const videoId = typeof submitted.video_id === 'string' ? submitted.video_id
    : typeof submitted.id === 'string' ? submitted.id : undefined
  if (videoId === undefined) throw new Error(`video submit returned no video_id: ${JSON.stringify(submitted).slice(0, 500)}`)
  params.onProgress?.(`video task submitted: ${videoId}`)
  // The query endpoint lives OUTSIDE /v1 and requires model_name for every mode.
  const queryBase = new URL(entry.baseURL).origin
  const queryUrl = `${queryBase}/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=${encodeURIComponent(entry.model)}`
  for (;;) {
    if (Date.now() > pollDeadline) throw new Error(`video task ${videoId} exceeded poll budget (${params.pollTimeoutMs} ms)`)
    await sleep(params.pollIntervalMs, signal)
    const status = await requestJson(queryUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    }, signal) as Record<string, unknown>
    const state = typeof status.status === 'string' ? status.status : ''
    if (state === 'completed') {
      const url = typeof status.url === 'string' && status.url.length > 0 ? status.url : undefined
      if (url === undefined) throw new Error(`video task completed without a url: ${JSON.stringify(status).slice(0, 500)}`)
      const downloaded = await fetchBytes(url, signal, entry.model)
      return { bytes: downloaded.bytes, mediaType: 'video/mp4' }
    }
    if (state === 'failed') {
      const error = status.error as { message?: string } | null
      throw new Error(`video task failed: ${error?.message ?? JSON.stringify(status).slice(0, 500)}`)
    }
    params.onProgress?.(`video task ${videoId}: ${state || 'queued'} ${typeof status.progress === 'number' ? `${status.progress}%` : ''}`.trim())
  }
}

async function openAiVideo(
  entry: MediaModelEntry,
  apiKey: string,
  params: VideoGenerationParams,
  signal: AbortSignal,
  pollDeadline: number,
): Promise<GeneratedVideo> {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  const submitted = await requestJson(`${entry.baseURL}/videos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: entry.model,
      prompt: params.prompt,
      seconds: String(params.seconds),
      size: params.size,
    }),
  }, signal) as Record<string, unknown>
  const id = typeof submitted.id === 'string' ? submitted.id : undefined
  if (id === undefined) throw new Error(`video submit returned no id: ${JSON.stringify(submitted).slice(0, 500)}`)
  params.onProgress?.(`video task submitted: ${id}`)
  for (;;) {
    if (Date.now() > pollDeadline) throw new Error(`video task ${id} exceeded poll budget (${params.pollTimeoutMs} ms)`)
    await sleep(params.pollIntervalMs, signal)
    const status = await requestJson(`${entry.baseURL}/videos/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    }, signal) as Record<string, unknown>
    const state = typeof status.status === 'string' ? status.status : ''
    if (state === 'completed') {
      const url = typeof status.url === 'string' && status.url.length > 0 ? status.url : undefined
      const downloaded = url !== undefined
        ? await fetchBytes(url, signal, entry.model)
        : await fetchBytes(`${entry.baseURL}/videos/${encodeURIComponent(id)}/content`, signal, entry.model)
      return { bytes: downloaded.bytes, mediaType: 'video/mp4' }
    }
    if (state === 'failed' || state === 'error') {
      throw new Error(`video task failed: ${JSON.stringify(status).slice(0, 500)}`)
    }
    params.onProgress?.(`video task ${id}: ${state || 'queued'}`)
  }
}
