/**
 * Custom `conversation.chat.commandview` rows for `/image` and `/video`
 * (ui-chat keyed command row, wire key = command name). When the handler ran
 * with `--wait`, the recorded `outcome.text` carries a `media-studio` payload
 * that renders as an inline gallery / video player; otherwise the row shows
 * the plain status text (and the finished media arrives as a chat push).
 */
import type { CSSProperties, ReactNode } from 'react'
import { decodeCommandPayload, stripCommandPayload } from '../types.ts'
import { MediaItemGrid } from './media.tsx'

/** Structural view of `CommandRowOwnerProps` (ui-chat contract). */
interface CommandRowOwnerPropsLike {
  node: {
    name: string | null
    args: string | null
    outcome: { kind: 'success' | 'error'; text?: string } | null
  }
}

const containerStyle: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.28)',
  borderRadius: 10,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

/** One media command row. */
export function MediaCommandRow(props: CommandRowOwnerPropsLike): ReactNode {
  const { node } = props
  const title = node.name === 'video' ? '🎬 /video' : '🖼️ /image'
  const args = node.args?.trim() ?? ''
  const outcome = node.outcome
  const payload = decodeCommandPayload(outcome?.text)
  const plain = stripCommandPayload(outcome?.text).trim()
  const failed = outcome?.kind === 'error'
  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12, opacity: 0.85 }}>
        <span>{title}</span>
        <span style={{ opacity: 0.75 }}>{args.slice(0, 120)}</span>
        {outcome === null ? <span style={{ opacity: 0.7 }}>生成中…</span> : null}
        {failed ? <span style={{ color: '#d9534f' }}>失败</span> : null}
      </div>
      {failed && plain !== '' ? (
        <div style={{ fontSize: 12, color: '#d9534f', whiteSpace: 'pre-wrap' }}>{plain}</div>
      ) : null}
      {payload !== undefined ? <MediaItemGrid items={payload.items} /> : null}
      {!failed && plain !== '' ? (
        <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: 'pre-wrap' }}>{plain}</div>
      ) : null}
    </div>
  )
}
