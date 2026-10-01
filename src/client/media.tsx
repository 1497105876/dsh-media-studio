/**
 * Shared browser components: inline media gallery, video player, and the
 * download action the stock chat UI does not provide.
 *
 * Rendering rules follow the DSH client contracts (packages/client/ui-tool
 * `tool.call.toolview`, ui-chat `conversation.chat.commandview` and
 * `conversation.message.images`): components receive session-authorized image
 * loaders and node data through props and never reach into services.
 *
 * Viewer experience: images open in a lightbox with name / dimensions / size
 * info, click-to-toggle 100% zoom (scrollable), fade-in, Esc / backdrop
 * close; the video card is width-adaptive (portrait safe) with a
 * name · size · download info row.
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

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
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

/** Inject once: the lightbox fade-in animation (inline styles can't keyframe). */
let lightboxStyleInjected = false
function injectLightboxStyle(): void {
  if (lightboxStyleInjected) return
  lightboxStyleInjected = true
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-media-studio'
  tag.textContent = '@keyframes ms-fade-in{from{opacity:0}to{opacity:1}}'
  document.head.appendChild(tag)
}

const lightboxBar: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
  padding: '0 4px', minHeight: 24,
}
const lightboxText: CSSProperties = {
  fontSize: 12, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const lightboxClose: CSSProperties = {
  marginLeft: 'auto', fontSize: 12, color: '#ddd', background: 'none',
  border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0,
}

/** Full-size overlay preview: name / dimensions / size info, click toggles
 *  fit-window ↔ 100% zoom (scrollable), one-click download, Esc / backdrop close. */
function Lightbox({ url, name, size, onClose }: { url: string; name: string; size?: number; onClose: () => void }): ReactNode {
  const [full, setFull] = useState(false)
  const [dims, setDims] = useState<{ w: number; h: number } | undefined>(undefined)
  useEffect(() => {
    injectLightboxStyle()
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const info = [
    dims !== undefined ? `${dims.w}×${dims.h}` : undefined,
    formatBytes(size) === '' ? undefined : formatBytes(size),
  ].filter(Boolean).join(' · ')
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 12, gap: 8, animation: 'ms-fade-in 160ms ease-out',
      }}
    >
      <div style={lightboxBar} onClick={event => event.stopPropagation()}>
        <span style={lightboxText} title={name}>{name}{info === '' ? '' : `　${info}`}</span>
        <button type="button" style={lightboxClose} onClick={onClose}>✕ 关闭</button>
      </div>
      <div
        style={{
          flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...(full ? { overflow: 'auto' } : {}),
        }}
      >
        <img
          src={url}
          alt={name}
          onLoad={event => {
            setDims({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
          }}
          onClick={event => {
            event.stopPropagation()
            setFull(previous => !previous)
          }}
          style={{
            borderRadius: 8,
            boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            ...(full
              ? { maxWidth: 'none', maxHeight: 'none', cursor: 'zoom-out', flexShrink: 0 }
              : { maxWidth: '92vw', maxHeight: '100%', objectFit: 'contain', cursor: 'zoom-in' }),
          }}
        />
      </div>
      <div style={lightboxBar} onClick={event => event.stopPropagation()}>
        <span style={{ ...lightboxText, opacity: 0.6 }}>{full ? '点击图片回到适应窗口' : '点击图片查看原始尺寸'}</span>
        <DownloadButton url={url} name={name} style={{ color: '#8fc4ff', marginLeft: 'auto' }} />
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
  onOpen: (url: string, name: string, bytes?: number) => void
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
      onClick={() => onOpen(url, name, image.attachment?.bytes)}
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
 * Chat image gallery with inline preview (lightbox) and direct download —
 * used both as the `conversation.message.images` fill and inside the
 * custom tool / command rows.
 */
export function MediaGallery({ images, loadImage, align = 'start', compact = false, thumbnail = false }: MediaGalleryProps): ReactNode {
  const [opened, setOpened] = useState<{ url: string; name: string; size?: number } | undefined>(undefined)
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
            onOpen={(url, name, bytes) => setOpened({ url, name, ...(bytes === undefined ? {} : { size: bytes }) })}
          />
        ))}
      </div>
      {opened === undefined ? null : (
        <Lightbox url={opened.url} name={opened.name} size={opened.size} onClose={() => setOpened(undefined)} />
      )}
    </div>
  )
}

/** Inline video player (width-adaptive, portrait safe) with a name · size · download row. */
export function MediaVideoCard({ item }: { item: MediaItemMeta }): ReactNode {
  const url = apiFileUrl(item.path)
  const name = fileLabel(item)
  if (url === undefined) {
    return <div style={{ fontSize: 12, opacity: 0.75 }}>{name}（文件未落盘，无法内联播放）</div>
  }
  const sizeText = formatBytes(item.bytes)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        controls
        preload="metadata"
        src={url}
        style={{
          width: 'min(520px, 100%)', maxHeight: '70vh', borderRadius: 10,
          background: '#000', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', display: 'block',
        }}
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 'min(520px, 100%)' }}>
        <span style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🎬 {name}{sizeText === '' ? '' : ` · ${sizeText}`}
        </span>
        <DownloadButton url={url} name={name} style={{ marginLeft: 'auto', flexShrink: 0 }} />
      </div>
    </div>
  )
}

/** Item grid used by tool / command rows: images (with actions) then videos.
 *  A single image renders aspect-true (no square crop); multiple images use a
 *  compact square grid. */
export function MediaItemGrid({ items }: { items: readonly MediaItemMeta[] }): ReactNode {
  const [opened, setOpened] = useState<{ url: string; name: string; size?: number } | undefined>(undefined)
  const images = items.filter(item => item.kind === 'image')
  const videos = items.filter(item => item.kind === 'video')
  const others = items.filter(item => item.kind !== 'image' && item.kind !== 'video')
  const many = images.length > 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.map(item => {
            const url = apiFileUrl(item.path)
            const name = fileLabel(item)
            if (url === undefined) return null
            const sizeText = formatBytes(item.bytes)
            return (
              <div key={item.path ?? item.name} style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '100%' }}>
                <button
                  type="button"
                  onClick={() => setOpened({ url, name, ...(item.bytes === undefined ? {} : { size: item.bytes }) })}
                  style={{
                    padding: 0, border: 'none', background: 'none', cursor: 'zoom-in',
                    lineHeight: 0, alignSelf: 'flex-start', maxWidth: '100%',
                  }}
                  title={name}
                >
                  <img
                    src={url}
                    alt={name}
                    style={many
                      ? { width: 96, height: 96, objectFit: 'cover', borderRadius: 8, display: 'block' }
                      : { maxWidth: 'min(360px, 100%)', maxHeight: 300, borderRadius: 8, display: 'block' }}
                  />
                </button>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 'min(360px, 100%)' }}>
                  <span style={{ fontSize: 11, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}{sizeText === '' ? '' : ` · ${sizeText}`}
                  </span>
                  <DownloadButton url={url} name={name} style={{ marginLeft: 'auto', flexShrink: 0 }} />
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
        <Lightbox url={opened.url} name={opened.name} size={opened.size} onClose={() => setOpened(undefined)} />
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
