/**
 * Settings tab for @gw/dsh-media-studio, mounted into the official
 * Settings → Plugins page (`settings.plugins.tab`, same seam as the stock
 * plugin-inventory tab).
 *
 * Everything runs over the official remote seams (no custom HTTP endpoints):
 *  - `ctx.remote.settings.describe/update` — the volatile Config projection of
 *    this plugin's profile entry (namespace = entry id `media-studio`);
 *  - `ctx.remote.credentials.describe/set/unset` — the credential seam the
 *    stock web-search / models pages use: key values are stored in the DSH
 *    credential store and only travel towards the host, never back.
 *
 * The host half needs no code for this: `resolveApiKey` already resolves
 * `credential-ref` entries through `ctx.credentials` at call time.
 */
import { createElement, useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { MediaModelEntry, MediaProvider } from '../types.js'

/** Namespace key — must equal the profile patch entry id that loads this plugin. */
const NS = 'media-studio'

const IMAGE_RESOLUTIONS = ['1K', '2K', '3K', '4K'] as const
const IMAGE_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9'] as const
const VIDEO_SIZES = ['720P', '1080P', '1K', '2K'] as const
const VIDEO_ASPECT_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const
const PROVIDERS = ['agnes', 'openai', 'openai-videos'] as const
/** Credential reference grammar (host: dsh-credentials REF_PATTERN). */
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

// ---- official remote API shapes (host: dsh-api-settings-controller / dsh-api-remotes) ----

interface SettingsNamespaceViewLike {
  ns: string
  value: Record<string, unknown>
  revision: number
  writable: boolean
}

interface SettingsDescribeValueLike {
  writable: boolean
  namespaces: SettingsNamespaceViewLike[]
}

interface CredentialInfoLike {
  configured: boolean
  source?: string
  writable: boolean
}

interface RemoteSettingsLike {
  describe(): Promise<{ ok: boolean, value?: SettingsDescribeValueLike }>
  update(ns: string, patch: Record<string, unknown>, revision: number | undefined): Promise<{ ok: boolean, value?: SettingsNamespaceViewLike }>
}

interface RemoteCredentialsLike {
  describe(refs: string[]): Promise<{ ok: boolean, value?: Record<string, CredentialInfoLike> }>
  set(ref: string, value: string): Promise<{ ok: boolean }>
  unset(ref: string): Promise<{ ok: boolean }>
}

/** Structural view of the client context this card needs. */
export interface SettingsCardContext {
  remote: {
    settings: RemoteSettingsLike
    credentials: RemoteCredentialsLike
  }
}

interface SlotOwnerProps {
  view?: string
  [key: string]: unknown
}

export interface SlotsContextLike {
  slots: {
    inject(slot: string, register: () => unknown): unknown
    register(entry: Record<string, unknown>, component: unknown): unknown
  }
}

// ---- shared inline styles (no stylesheet pipeline for an out-of-tree package) ----

const container: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760,
}
const section: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.28)', borderRadius: 10,
  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
}
const sectionTitle: CSSProperties = {
  fontSize: 13, fontWeight: 600, opacity: 0.9,
}
const row: CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
}
const field: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 3, minWidth: 120, flex: '1 1 140px',
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
const primaryButton: CSSProperties = { ...button, fontWeight: 600 }
const badge = (configured: boolean): CSSProperties => ({
  fontSize: 10, borderRadius: 999, padding: '2px 8px',
  border: '1px solid', borderColor: configured ? 'rgba(52,199,89,0.55)' : 'rgba(128,128,128,0.4)',
  color: configured ? 'rgb(52,199,89)' : 'inherit', opacity: configured ? 1 : 0.65,
})
const entryCard: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.25)', borderRadius: 8,
  padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
}
const messageStyle = (isError: boolean): CSSProperties => ({
  fontSize: 12, color: isError ? 'rgb(255,105,97)' : 'rgb(52,199,89)', minHeight: 16,
})

// ---- helpers ----

function modelsOf(draft: Record<string, unknown>, key: 'imageModels' | 'videoModels'): MediaModelEntry[] {
  const raw = draft[key]
  return Array.isArray(raw) ? raw as MediaModelEntry[] : []
}

function credentialRefs(...groups: readonly MediaModelEntry[][]): string[] {
  const seen = new Set<string>()
  for (const group of groups) {
    for (const entry of group) {
      const name = entry.apiKeyEnv?.trim() ?? ''
      if (name !== '' && REF_PATTERN.test(name)) seen.add(name)
    }
  }
  return [...seen]
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

// ---- components ----

function Field(props: { label: string, children: ReactNode }): JSX.Element {
  return (
    <label style={field}>
      <span style={label}>{props.label}</span>
      {props.children}
    </label>
  )
}

function Select(props: { value: string, options: readonly string[], onChange: (value: string) => void }): JSX.Element {
  return (
    <select style={input} value={props.value} onChange={event => props.onChange(event.target.value)}>
      {props.options.includes(props.value) ? null : <option value={props.value}>{props.value}</option>}
      {props.options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  )
}

function CredentialRow(props: {
  name: string
  info: CredentialInfoLike | undefined
  onSaved: () => void
  ctx: SettingsCardContext
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
        <button style={primaryButton} disabled={value.trim() === ''} onClick={() => { void save() }}>保存</button>
        <button style={button} disabled={info?.configured !== true} onClick={() => { void clear() }}>清除</button>
      </div>
      {error === '' ? null : <span style={messageStyle(true)}>{error}</span>}
    </div>
  )
}

function ModelEntryCard(props: {
  kind: 'image' | 'video'
  index: number
  entry: MediaModelEntry
  onChange: (index: number, patch: Partial<MediaModelEntry>) => void
  onRemove: (index: number) => void
}): JSX.Element {
  const entry = props.entry
  const patch = (partial: Partial<MediaModelEntry>): void => props.onChange(props.index, partial)
  return (
    <div style={entryCard}>
      <div style={row}>
        <code style={{ fontSize: 12 }}>{entry.id || '(无 id)'}</code>
        <span style={label}>{entry.label}</span>
        <span style={{ flex: 1 }} />
        <button style={button} onClick={() => props.onRemove(props.index)}>删除</button>
      </div>
      <div style={row}>
        <Field label="id（工具里引用的名字）">
          <input style={input} value={entry.id} onChange={event => patch({ id: event.target.value })} />
        </Field>
        <Field label="显示名">
          <input style={input} value={entry.label} onChange={event => patch({ label: event.target.value })} />
        </Field>
        <Field label="provider">
          <Select value={entry.provider} options={PROVIDERS} onChange={value => patch({ provider: value as MediaProvider })} />
        </Field>
      </div>
      <div style={row}>
        <Field label="模型名">
          <input style={input} value={entry.model} onChange={event => patch({ model: event.target.value })} />
        </Field>
        <Field label="Base URL">
          <input style={input} value={entry.baseURL} onChange={event => patch({ baseURL: event.target.value })} />
        </Field>
        <Field label="Key 环境变量名">
          <input style={input} value={entry.apiKeyEnv} onChange={event => patch({ apiKeyEnv: event.target.value })} />
        </Field>
      </div>
    </div>
  )
}

/** The settings card body. */
export function MediaStudioSettingsCard(props: { ctx: SettingsCardContext, view?: string }): JSX.Element {
  const ctx = props.ctx
  const [view, setView] = useState<SettingsNamespaceViewLike | null>(null)
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [creds, setCreds] = useState<Record<string, CredentialInfoLike>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [missing, setMissing] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setError('')
    setMissing(false)
    const res = await ctx.remote.settings.describe()
    if (!res.ok || res.value === undefined) { setError('读取配置失败：设置服务不可用'); return }
    const found = res.value.namespaces.find(namespace => namespace.ns === NS)
    if (found === undefined) { setMissing(true); return }
    setView(found)
    setDraft(structuredClone(found.value) as Record<string, unknown>)
    const refs = credentialRefs(modelsOf(found.value, 'imageModels'), modelsOf(found.value, 'videoModels'))
    if (refs.length > 0) {
      const credRes = await ctx.remote.credentials.describe(refs)
      if (credRes.ok && credRes.value !== undefined) setCreds(credRes.value)
    }
  }, [ctx])

  useEffect(() => { void load() }, [load])

  // The plugins list renders each entry twice: a summary line and the full
  // tab page. Keep the summary a single plain sentence.
  if (props.view === 'summary') return <span>在对话里生成图片 / 视频、管理模型与 API Key</span>

  if (missing) {
    return (
      <div style={container}>
        <div style={section}>
          <span style={messageStyle(true)}>
            未找到配置命名空间「{NS}」——插件尚未在 profile 里加载（检查 bundles 与 cordis.patch.yml 的 insert id）。
          </span>
        </div>
      </div>
    )
  }

  const imageModels = modelsOf(draft, 'imageModels')
  const videoModels = modelsOf(draft, 'videoModels')
  const refs = credentialRefs(imageModels, videoModels)

  const setField = (key: string, value: unknown): void => setDraft(previous => ({ ...previous, [key]: value }))

  const changeEntry = (kind: 'imageModels' | 'videoModels', index: number, patch: Partial<MediaModelEntry>): void => {
    setDraft(previous => {
      const list = [...modelsOf(previous, kind)]
      list[index] = { ...list[index], ...patch }
      return { ...previous, [kind]: list }
    })
  }
  const removeEntry = (kind: 'imageModels' | 'videoModels', index: number): void => {
    setDraft(previous => ({ ...previous, [kind]: modelsOf(previous, kind).filter((_, i) => i !== index) }))
  }
  const addEntry = (kind: 'imageModels' | 'videoModels'): void => {
    setDraft(previous => ({
      ...previous,
      [kind]: [...modelsOf(previous, kind), {
        id: '',
        label: '',
        provider: kind === 'imageModels' ? 'openai' : 'openai-videos',
        model: '',
        baseURL: '',
        apiKeyEnv: '',
      } as MediaModelEntry],
    }))
  }

  const save = async (): Promise<void> => {
    if (view === null) return
    const badEntry = [...imageModels, ...videoModels].find(entry => !REF_PATTERN.test(entry.id.trim()) || entry.model.trim() === '')
    if (badEntry !== undefined) { setError(`条目「${badEntry.id || '(无 id)'}」的 id 必须是字母/数字/连字符，模型名不能为空`); return }
    setBusy(true)
    setError('')
    try {
      const res = await ctx.remote.settings.update(NS, draft, view.revision)
      if (!res.ok || res.value === undefined) {
        setError('保存被拒绝：配置已在别处修改，已重新加载最新值')
        await load()
        return
      }
      setView(res.value)
      setDraft(structuredClone(res.value.value) as Record<string, unknown>)
      setMessage('已保存，配置即时生效')
    } finally {
      setBusy(false)
    }
  }

  const refreshCreds = async (): Promise<void> => {
    const next = refs.length === 0 ? {} : await (async () => {
      const res = await ctx.remote.credentials.describe(refs)
      return res.ok && res.value !== undefined ? res.value : {}
    })()
    setCreds(next)
  }

  return (
    <div style={container}>
      <div style={section}>
        <span style={sectionTitle}>凭据（API Key）</span>
        <span style={label}>
          Key 保存在 dsh 凭据库里，只写不读；模型条目的「Key 环境变量名」引用这里配置的条目。
        </span>
        {refs.length === 0 ? <span style={label}>（模型条目还没有引用任何凭据名）</span> : null}
        {refs.map(name => (
          <CredentialRow
            key={name}
            name={name}
            info={creds[name]}
            ctx={ctx}
            onSaved={() => { void refreshCreds() }}
          />
        ))}
      </div>

      <div style={section}>
        <span style={sectionTitle}>模型条目</span>
        <span style={label}>图片模型（{imageModels.length}）</span>
        {imageModels.map((entry, index) => (
          <ModelEntryCard key={index} kind="image" index={index} entry={entry}
            onChange={(index_, patch) => changeEntry('imageModels', index_, patch)}
            onRemove={index_ => removeEntry('imageModels', index_)} />
        ))}
        <button style={button} onClick={() => addEntry('imageModels')} disabled={view?.writable === false}>+ 添加图片模型</button>
        <span style={label}>视频模型（{videoModels.length}）</span>
        {videoModels.map((entry, index) => (
          <ModelEntryCard key={index} kind="video" index={index} entry={entry}
            onChange={(index_, patch) => changeEntry('videoModels', index_, patch)}
            onRemove={index_ => removeEntry('videoModels', index_)} />
        ))}
        <button style={button} onClick={() => addEntry('videoModels')} disabled={view?.writable === false}>+ 添加视频模型</button>
      </div>

      <div style={section}>
        <span style={sectionTitle}>默认参数</span>
        <div style={row}>
          <Field label="默认图片模型">
            <Select value={asString(draft.defaultImageModel)} options={imageModels.map(entry => entry.id)}
              onChange={value => setField('defaultImageModel', value)} />
          </Field>
          <Field label="默认视频模型">
            <Select value={asString(draft.defaultVideoModel)} options={videoModels.map(entry => entry.id)}
              onChange={value => setField('defaultVideoModel', value)} />
          </Field>
        </div>
        <div style={row}>
          <Field label="输出目录（相对会话工作目录）">
            <input style={input} value={asString(draft.outputDir)} onChange={event => setField('outputDir', event.target.value)} />
          </Field>
          <Field label="自动保存">
            <select style={input} value={asBoolean(draft.autoSave) ? 'true' : 'false'}
              onChange={event => setField('autoSave', event.target.value === 'true')}>
              <option value="true">开启</option>
              <option value="false">关闭</option>
            </select>
          </Field>
        </div>
        <div style={row}>
          <Field label="图片分辨率">
            <Select value={asString(draft.imageResolution)} options={IMAGE_RESOLUTIONS}
              onChange={value => setField('imageResolution', value)} />
          </Field>
          <Field label="图片画幅">
            <Select value={asString(draft.imageAspectRatio)} options={IMAGE_ASPECT_RATIOS}
              onChange={value => setField('imageAspectRatio', value)} />
          </Field>
        </div>
        <div style={row}>
          <Field label="视频时长（秒，4–12）">
            <input style={input} type="number" min={4} max={12} value={asNumber(draft.videoSeconds, 5)}
              onChange={event => setField('videoSeconds', Math.min(12, Math.max(4, Number(event.target.value) || 5)))} />
          </Field>
          <Field label="视频尺寸">
            <Select value={asString(draft.videoSize)} options={VIDEO_SIZES}
              onChange={value => setField('videoSize', value)} />
          </Field>
          <Field label="视频画幅">
            <Select value={asString(draft.videoAspectRatio)} options={VIDEO_ASPECT_RATIOS}
              onChange={value => setField('videoAspectRatio', value)} />
          </Field>
        </div>
      </div>

      <div style={row}>
        <button style={primaryButton} disabled={busy || view?.writable === false} onClick={() => { void save() }}>
          {busy ? '保存中…' : '保存配置'}
        </button>
        <button style={button} disabled={busy} onClick={() => { void load() }}>重新加载</button>
        <span style={messageStyle(error !== '')}>{error !== '' ? error : message}</span>
      </div>
      {view?.writable === false ? <span style={messageStyle(true)}>当前 profile 不接受表单写入（只读）。</span> : null}
    </div>
  )
}

/**
 * Contribute the card as a tab of the official Settings → Plugins section
 * (`settings.plugins.tab`, the seam the stock plugin-inventory tab uses).
 */
export function registerSettingsTab(rawCtx: SlotsContextLike): void {
  const ctx = rawCtx as SlotsContextLike & SettingsCardContext
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register(
    {
      name: 'settings.plugins.tab',
      id: NS,
      order: 30,
      label: () => '媒体生成',
    },
    (ownerProps: SlotOwnerProps) => createElement(MediaStudioSettingsCard, {
      ctx,
      view: ownerProps.view,
    }),
  ))
}
