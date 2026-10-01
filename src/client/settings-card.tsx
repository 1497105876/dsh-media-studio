/**
 * Credential card for @gw/dsh-media-studio, mounted into the plugin's own
 * configuration page via the `plugins.item` slot — the same seam the official
 * web-search settings page uses (`ctx.configForms.whileServed([ns], …)`).
 *
 * The volatile Config fields (model catalog, defaults, resolution…) are already
 * edited by the stock auto-generated settings form for this entry; the only
 * thing that form does not cover is API keys, because key values never ride
 * the settings read path. They go through the official credential seam:
 *
 *   ctx.remote.credentials.describe([ref]) / set(ref, value) / unset(ref)
 *
 * Key values are stored in the DSH credential store and only travel towards
 * the host. The host half resolves `credential-ref` entries through
 * `ctx.credentials` at call time, so it needs no changes for this.
 */
import { createElement, useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

/** Namespace key — must equal the profile patch entry id that loads this plugin. */
const NS = 'media-studio'

/** Credential reference grammar (host: dsh-credentials REF_PATTERN). */
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

// ---- official remote API shapes (host: dsh-api-settings-controller / dsh-api-remotes) ----

interface CredentialInfoLike {
  configured: boolean
  source?: string
  writable: boolean
}

interface RemoteCredentialsLike {
  describe(refs: string[]): Promise<{ ok: boolean, value?: Record<string, CredentialInfoLike> }>
  set(ref: string, value: string): Promise<{ ok: boolean }>
  unset(ref: string): Promise<{ ok: boolean }>
}

interface RemoteSettingsLike {
  describe(): Promise<{ ok: boolean, value?: { namespaces: { ns: string, value: Record<string, unknown> }[] } }>
}

/** Structural view of the client context this card needs. */
export interface CredentialCardContext {
  remote: {
    credentials: RemoteCredentialsLike
    settings: RemoteSettingsLike
    $on(event: string, listener: (payload: unknown) => void): unknown
  }
}

interface SlotOwnerProps {
  view?: string
  [key: string]: unknown
}

export interface SlotsContextLike {
  effect(fn: () => unknown): unknown
  slots: {
    inject(slot: string, register: () => unknown): unknown
    register(entry: Record<string, unknown>, component: unknown): unknown
  }
  configForms: {
    whileServed(namespaces: string[], mount: () => unknown): unknown
  }
}

// ---- inline styles (no stylesheet pipeline for an out-of-tree package) ----

const container: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10,
}
const row: CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
}
const entryCard: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.25)', borderRadius: 8,
  padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
}
const label: CSSProperties = { fontSize: 11, opacity: 0.7 }
const input: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.4)', borderRadius: 6,
  padding: '4px 8px', fontSize: 12, background: 'transparent', color: 'inherit',
}
const button: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.45)', borderRadius: 6,
  padding: '4px 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'inherit',
}
const badge = (configured: boolean): CSSProperties => ({
  fontSize: 10, borderRadius: 999, padding: '2px 8px',
  border: '1px solid', borderColor: configured ? 'rgba(52,199,89,0.55)' : 'rgba(128,128,128,0.4)',
  color: configured ? 'rgb(52,199,89)' : 'inherit', opacity: configured ? 1 : 0.65,
})
const messageStyle = (isError: boolean): CSSProperties => ({
  fontSize: 12, color: isError ? 'rgb(255,105,97)' : 'rgb(52,199,89)', minHeight: 14,
})

// ---- helpers ----

/** Collect the credential names the entry's model catalog references. */
function credentialRefs(value: Record<string, unknown>): string[] {
  const seen = new Set<string>()
  for (const key of ['imageModels', 'videoModels']) {
    const raw = value[key]
    if (!Array.isArray(raw)) continue
    for (const entry of raw as { apiKeyEnv?: unknown }[]) {
      const name = typeof entry?.apiKeyEnv === 'string' ? entry.apiKeyEnv.trim() : ''
      if (name !== '' && REF_PATTERN.test(name)) seen.add(name)
    }
  }
  return [...seen]
}

// ---- components ----

function CredentialRow(props: {
  name: string
  info: CredentialInfoLike | undefined
  ctx: CredentialCardContext
  onSaved: () => void
}): JSX.Element {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const info = props.info
  const save = async (): Promise<void> => {
    const trimmed = value.trim()
    if (trimmed === '') return
    setError('')
    const res = await props.ctx.remote.credentials.set(props.name, trimmed)
    if (!res.ok) { setError('凭据服务拒绝了写入'); return }
    setValue('')
    props.onSaved()
  }
  const clear = async (): Promise<void> => {
    setError('')
    const res = await props.ctx.remote.credentials.unset(props.name)
    if (!res.ok) { setError('凭据服务拒绝了清除'); return }
    props.onSaved()
  }
  return (
    <div style={entryCard}>
      <div style={row}>
        <code style={{ fontSize: 12 }}>{props.name}</code>
        <span style={badge(info?.configured === true)}>{info?.configured === true ? '已配置' : '未配置'}</span>
        {info?.source === undefined ? null : <span style={label}>{info.source}</span>}
      </div>
      <div style={row}>
        <input
          style={{ ...input, flex: '1 1 220px' }}
          type="password"
          placeholder="粘贴 API Key（保存进 dsh 凭据库，不会回显）"
          value={value}
          onChange={event => setValue(event.target.value)}
        />
        <button style={button} disabled={value.trim() === ''} onClick={() => { void save() }}>保存</button>
        <button style={button} disabled={info?.configured !== true} onClick={() => { void clear() }}>清除</button>
      </div>
      {error === '' ? null : <span style={messageStyle(true)}>{error}</span>}
    </div>
  )
}

/** The credential card body. */
export function MediaStudioCredentialCard(props: { ctx: CredentialCardContext, view?: string }): JSX.Element {
  const ctx = props.ctx
  const [refs, setRefs] = useState<string[]>([])
  const [creds, setCreds] = useState<Record<string, CredentialInfoLike>>({})
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (): Promise<void> => {
    setError('')
    const res = await ctx.remote.settings.describe()
    if (!res.ok || res.value === undefined) { setError('读取配置失败：设置服务不可用'); return }
    const found = res.value.namespaces.find(namespace => namespace.ns === NS)
    if (found === undefined) { setMissing(true); setRefs([]); return }
    setMissing(false)
    const nextRefs = credentialRefs(found.value)
    setRefs(nextRefs)
    if (nextRefs.length > 0) {
      const credRes = await ctx.remote.credentials.describe(nextRefs)
      if (credRes.ok && credRes.value !== undefined) setCreds(credRes.value)
    }
  }, [ctx])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void ctx.remote.$on('credentials/reference-updated', () => { void load() }) }, [load])

  // The plugin list renders each entry as a summary line too; keep it short.
  if (props.view === 'summary') return <span>在对话里生成图片 / 视频；API Key 在凭据区填写</span>

  return (
    <div style={container}>
      {missing ? <span style={messageStyle(true)}>插件未加载（找不到配置命名空间「{NS}」）。</span> : null}
      {error === '' ? null : <span style={messageStyle(true)}>{error}</span>}
      {refs.length === 0 && !missing
        ? <span style={label}>（模型条目还没有引用任何凭据名；在配置表单里给条目填「Key 环境变量名」）</span>
        : null}
      {refs.map(name => (
        <CredentialRow
          key={name}
          name={name}
          info={creds[name]}
          ctx={ctx}
          onSaved={() => { void load() }}
        />
      ))}
      <span style={label}>Key 也可以不填在这里：设置系统环境变量（如 setx AGNES_API_KEY …）后重启 dsh，效果相同。</span>
    </div>
  )
}

/**
 * Mount the credential card while the host serves this entry's configuration
 * form — the official web-search page pattern (`plugins.item` slot wrapped in
 * `ctx.configForms.whileServed`).
 */
export function registerCredentialCard(rawCtx: SlotsContextLike): void {
  const ctx = rawCtx as SlotsContextLike & CredentialCardContext
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject('plugins.item', () => ctx.slots.register(
    {
      name: 'plugins.item',
      id: NS,
      order: 40,
      label: () => '媒体生成',
    },
    (ownerProps: SlotOwnerProps) => createElement(MediaStudioCredentialCard, {
      ctx,
      view: ownerProps.view,
    }),
  ))))
}
