/**
 * Shared browser components: inline media gallery, video player, and the
 * download / save-as actions the stock chat UI does not provide.
 *
 * Rendering rules follow the DSH client contracts (packages/client/ui-tool
 * `tool.call.toolview`, ui-chat `conversation.chat.commandview` and
 * `conversation.message.images`): components receive session-authorized image
 * loaders and node data through props and never reach into services.
 */
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { MediaItemMeta, MediaResultMeta } from '../types.ts'

/** One durable image reference or a submission-echo preview (ui-conversation contract). */
export interface ImageSourceLike {
  attachment?: {
    attachmentId: string
    mediaType: string
    bytes: number
    width: number
    height: number
    name?: string
  }
  label?: string
  preview?: { url: string; name?: string; width?: number; height?: number }
}

/** Session-authorized durable image loader (blob URL). */
export type ImageLoaderLike = ((attachment: NonNullable<ImageSourceLike['attachment']>) => Promise<string>) & {
  peek?: (attachment: NonNullable<ImageSourceLike['attachment']>) => string | undefined
}

const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/])/

/** Build the authenticated `/api/file` URL for an absolute host path (mirrors `fileMediaUrl`). */
export function apiFileUrl(path: string | undefined): string | undefined {
  if (path === undefined || !ABSOLUTE_PATH.test(path) || path.startsWith('//')) return undefined
  if (/[\u0000-\u001f\u007f]/.test(path)) return undefined
  try {
    return new URL(`api/file?path=${encodeURIComponent(path)}`, document.baseURI).href
  } catch {
    return undefined
  }
}

function fileLabel(item: { name: string }): string {
  return item.name
}

/** Trigger a direct browser download ("下载" — one copy, straight to the Downloads folder). */
export function DownloadButton({ url, name, style }: { url: string; name: string; style?: CSSProperties }): ReactNode {
  return (
    <a
      href={url}
      download={name}
      style={{ fontSize: 12, color: '#4a90d9', textDecoration: 'none', cursor: 'pointer', ...style }}
    >
      ⬇ 下载
    </a>
  )
}

/** "另存为": File System Access API picker, falling back to opening the URL. */
export function SaveAsButton({ url, name, style }: { url: string; name: string; style?: CSSProperties }): ReactNode {
  const onClick = useCallback(async () => {
    const picker = (window as unknown as { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable(): Promise<{ write(data: unknown): Promise<void>; close(): Promise<void> }> }> }).showSaveFilePicker
    if (typeof picker === 'function') {
      try {
        const response = await fetch(url)
        const blob = await response.blob()
        const handle = await picker({ suggestedName: name })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch {
        // User cancelled or the picker failed: fall through to plain open.
      }
    }
    window.open(url, '_blank', 'noopener')
  }, [url, name])
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      style={{
        fontSize: 12, color: '#4a90d9', background: 'none', border: 'none',
        padding: 0, cursor: 'pointer', ...style,
      }}
    >
      💾 另存为
    </button>
  )
}

/** Full-size overlay preview with download / save-as / close actions. */
function Lightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }): ReactNode {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.78)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}
    >
      <img src={url} alt={name} style={{ maxWidth: '92vw', maxHeight: '80vh', borderRadius: 8 }} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }} onClick={event => event.stopPropagation()}>
        <DownloadButton url={url} name={name} style={{ color: '#8fc4ff' }} />
        <SaveAsButton url={url} name={name} style={{ color: '#8fc4ff' }} />
        <button
          type="button"
          onClick={onClose}
          style={{ fontSize: 12, color: '#ddd', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ✕ 关闭
        </button>
      </div>
    </div>
  )
}

/** Resolve one image source to a displayable URL (blob for attachments, direct URL for previews). */
function useImageSource(image: ImageSourceLike, loadImage: ImageLoaderLike | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => {
    if (image.preview !== undefined) return image.preview.url
    if (image.attachment !== undefined && loadImage?.peek !== undefined) return loadImage.peek(image.attachment)
    return undefined
  })
  useEffect(() => {
    if (url !== undefined) return
    if (image.preview !== undefined) {
      setUrl(image.preview.url)
      return
    }
    if (image.attachment === undefined || loadImage === undefined) return
    let cancelled = false
    void loadImage(image.attachment).then(loaded => {
      if (!cancelled) setUrl(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [image, loadImage, url])
  return url
}

interface GalleryItemProps {
  image: ImageSourceLike
  loadImage?: ImageLoaderLike
  size: number
  onOpen: (url: string, name: string) => void
}

function GalleryTile({ image, loadImage, size, onOpen }: GalleryItemProps): ReactNode {
  const url = useImageSource(image, loadImage)
  const name = image.preview?.name ?? image.attachment?.name ?? image.label ?? 'image'
  if (url === undefined) {
    return <div style={{ width: size, height: size, borderRadius: 8, background: 'rgba(128,128,128,0.18)' }} />
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(url, name)}
      title={name}
      style={{
        padding: 0, border: 'none', background: 'none', cursor: 'zoom-in',
        width: size, height: size, borderRadius: 8, overflow: 'hidden',
      }}
    >
      <img
        src={url}
        alt={name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </button>
  )
}

export interface MediaGalleryProps {
  images: readonly ImageSourceLike[]
  loadImage?: ImageLoaderLike
  align?: 'start' | 'end'
  compact?: boolean
  thumbnail?: boolean
}

/**
 * Chat image gallery with inline preview (lightbox), direct download, and
 * save-as — used both as the `conversation.message.images` fill and inside the
 * custom tool / command rows.
 */
export function MediaGallery({ images, loadImage, align = 'start', compact = false, thumbnail = false }: MediaGalleryProps): ReactNode {
  const [opened, setOpened] = useState<{ url: string; name: string } | undefined>(undefined)
  const size = thumbnail ? 56 : compact ? 80 : 112
  return (
    <div>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
        }}
      >
        {images.map((image, index) => (
          <GalleryTile
            key={image.attachment?.attachmentId ?? image.preview?.url ?? index}
            image={image}
            {...(loadImage === undefined ? {} : { loadImage })}
            size={size}
            onOpen={(url, name) => setOpened({ url, name })}
          />
        ))}
      </div>
      {opened === undefined ? null : (
        <Lightbox url={opened.url} name={opened.name} onClose={() => setOpened(undefined)} />
      )}
    </div>
  )
}

/** Inline video player with download / save-as / open actions. */
export function MediaVideoCard({ item }: { item: MediaItemMeta }): ReactNode {
  const url = apiFileUrl(item.path)
  const name = fileLabel(item)
  if (url === undefined) {
    return <div style={{ fontSize: 12, opacity: 0.75 }}>{name}（文件未落盘，无法内联播放）</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        controls
        preload="metadata"
        src={url}
        style={{ width: 'min(420px, 100%)', borderRadius: 8, background: '#000' }}
      />
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <DownloadButton url={url} name={name} />
        <SaveAsButton url={url} name={name} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#4a90d9', textDecoration: 'none' }}
        >
          ↗ 新窗口打开
        </a>
      </div>
    </div>
  )
}

/** Item grid used by tool / command rows: images (with actions) then videos. */
export function MediaItemGrid({ items }: { items: readonly MediaItemMeta[] }): ReactNode {
  const [opened, setOpened] = useState<{ url: string; name: string } | undefined>(undefined)
  const images = items.filter(item => item.kind === 'image')
  const videos = items.filter(item => item.kind === 'video')
  const others = items.filter(item => item.kind !== 'image' && item.kind !== 'video')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.map(item => {
            const url = apiFileUrl(item.path)
            const name = fileLabel(item)
            if (url === undefined) return null
            return (
              <div key={item.path ?? item.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setOpened({ url, name })}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}
                  title={name}
                >
                  <img
                    src={url}
                    alt={name}
                    style={{ width: 112, height: 112, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                  />
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <DownloadButton url={url} name={name} />
                  <SaveAsButton url={url} name={name} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {videos.map(item => <MediaVideoCard key={item.path ?? item.name} item={item} />)}
      {others.map(item => (
        <div key={item.path ?? item.name} style={{ fontSize: 12, opacity: 0.8 }}>
          📄 {item.path ?? item.name}
        </div>
      ))}
      {opened === undefined ? null : (
        <Lightbox url={opened.url} name={opened.name} onClose={() => setOpened(undefined)} />
      )}
    </div>
  )
}

/** Parse a persisted `presentationMeta` payload. */
export function parseMediaMeta(meta: unknown): MediaResultMeta | undefined {
  if (meta === null || typeof meta !== 'object') return undefined
  const items = (meta as { items?: unknown }).items
  if (!Array.isArray(items)) return undefined
  return { items: items as MediaItemMeta[] }
}
