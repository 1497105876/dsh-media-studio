/**
 * Custom `tool.call.toolview` rows for `generate_image` / `generate_video` /
 * `send_media` (packages/client/ui-tool keyed tool view, wire key = tool
 * name). The stock generic row flattens image blocks to JSON, so these rows
 * render the persisted `result.meta` projection instead: inline gallery /
 * video player with download and save-as.
 */
import type { CSSProperties, ReactNode } from 'react'
import { MediaItemGrid, parseMediaMeta } from './media.tsx'

/** Structural view of the owner props a keyed tool view receives (ui-tool contract `ToolCallOwnerProps`). */
interface ToolCallOwnerPropsLike {
  toolName: string
  callId: string
  useDisclosure: { open: boolean; toggle: () => void }
  openFile: (path: string, options?: { line?: number }) => void
  phase: 'preparing' | 'start' | 'result'
  block: {
    argsRaw?: string
    call?: { name: string; argsRaw: string } | null
    content?: readonly { type: string; text?: string }[]
    isError?: boolean
    error?: { name: string; code: string; reason?: string }
    meta?: unknown
  }
}

function promptFromArgs(argsRaw: string | undefined): string {
  if (argsRaw === undefined) return ''
  try {
    const parsed = JSON.parse(argsRaw) as { prompt?: unknown; paths?: unknown; caption?: unknown }
    if (typeof parsed.prompt === 'string') return parsed.prompt
    if (typeof parsed.caption === 'string') return parsed.caption
    if (Array.isArray(parsed.paths)) return parsed.paths.map(String).join(', ')
  } catch { /* keep empty */ }
  return ''
}

function firstText(block: ToolCallOwnerPropsLike['block']): string {
  for (const item of block.content ?? []) {
    if (item.type === 'text' && typeof item.text === 'string') return item.text
  }
  return ''
}

const containerStyle: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.28)',
  borderRadius: 10,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const headStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'baseline',
  fontSize: 12,
  opacity: 0.85,
}

/** One media tool row (all phases). */
export function MediaToolRow(props: ToolCallOwnerPropsLike): ReactNode {
  const { phase, block, toolName } = props
  const title = toolName === 'generate_image' ? '🖼️ 生成图片'
    : toolName === 'generate_video' ? '🎬 生成视频'
      : '📎 发送媒体文件'
  if (phase !== 'result') {
    const prompt = promptFromArgs(block.argsRaw ?? block.call?.argsRaw)
    return (
      <div style={containerStyle}>
        <div style={headStyle}>
          <span>{title}</span>
          <span style={{ opacity: 0.7 }}>生成中…</span>
        </div>
        {prompt === '' ? null : <div style={{ fontSize: 12, opacity: 0.75 }}>{prompt}</div>}
      </div>
    )
  }
  const meta = parseMediaMeta(block.meta)
  const text = firstText(block).trim()
  const failed = block.isError === true
  return (
    <div style={containerStyle}>
      <div style={headStyle}>
        <span>{failed ? '⚠️' : title}</span>
        {failed ? <span style={{ color: '#d9534f' }}>失败</span> : null}
      </div>
      {failed && text !== '' ? (
        <div style={{ fontSize: 12, color: '#d9534f', whiteSpace: 'pre-wrap' }}>{text}</div>
      ) : null}
      {meta !== undefined && meta.items.length > 0 ? <MediaItemGrid items={meta.items} /> : null}
      {!failed && text !== '' ? (
        <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: 'pre-wrap' }}>{text}</div>
      ) : null}
    </div>
  )
}
