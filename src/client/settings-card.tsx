/**
 * Credential card for @gw/dsh-media-studio — the plugin's card on the Plugins
 * page, registered into the `plugins.bundle.config` keyed slot (key = the npm
 * package name) exactly like the reference implementation `@gw/dsh-mimotts`
 * does (`ctx.configForms.whileServed([ns], …)` wrapping).
 *
 * Scope of this card: API keys only. Every volatile Config field (model
 * catalog, defaults, resolution…) is already edited by the stock auto-generated
 * form that the host serves for the same entry; this card covers the one thing
 * that form cannot — key values never ride the settings read path. They are
 * stored through the official credential seam:
 *
 *   ctx.remote.credentials.describe([ref]) / set(ref, value) / unset(ref)
 *
 * The credential references themselves come from the entry's resolved section
 * (`configForms.get(ns)` snapshot): each model entry's `apiKeyEnv` names one.
 * The host half resolves `credential-ref` entries through `ctx.credentials` at
 * call time, so it needs no changes for this card to work.
 */
import { createElement, useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'

/** Namespace key — must equal the profile patch entry id that loads this plugin. */
const NS = 'media-studio'

/** Key on the Plugins page's `plugins.bundle.config` keyed slot: the npm package name. */
const PACKAGE_KEY = '@gw/dsh-media-studio'

/** Credential reference grammar (host: dsh-credentials REF_PATTERN). */
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

// ---- official remote / scope shapes (host: dsh-api-settings-controller, client: configForms) ----

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

interface ScopeSnapshotLike {
  status: 'loading' | 'ready' | 'unavailable'
  value: Record<string, unknown> | undefined
}

interface ConfigFormScopeLike {
  getSnapshot(): ScopeSnapshotLike
  subscribe(listener: () => void): () => void
}

interface ConfigFormsLike {
  get(ns: string): ConfigFormScopeLike
  whileServed(namespaces: string[], mount: () => unknown): unknown
}

/** Structural view of the client context this card needs. */
export interface CredentialCardContext {
  configForms: ConfigFormsLike
  remote: {
    credentials: RemoteCredentialsLike
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
  configForms: ConfigFormsLike
  remote: CredentialCardContext['remote']
}

// ---- inline styles (no stylesheet pipeline for an out-of-tree package) ----

const container: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10,
}
const row: CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center',
}
const note: CSSProperties = { fontSize: 11, opacity: 0.7 }
const status = (isError: boolean): CSSProperties => ({
  fontSize: 12, color: isError ? 'rgb(255,105,97)' : 'rgb(52,199,89)', minHeight: 14,
})

// ---- helpers ----

/** Collect the credential names the entry's model catalog references. */
function credentialRefs(value: Record<string, unknown> | undefined): string[] {
  const seen = new Set<string>()
  if (value === undefined) return []
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
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const info = props.info

  const save = async (): Promise<void> => {
    const trimmed = draft.trim()
    if (trimmed === '') return
    setError('')
    const res = await props.ctx.remote.credentials.set(props.name, trimmed)
    if (!res.ok) { setError('凭据服务拒绝了写入'); return }
    setDraft('')
    props.onSaved()
  }

  const clear = async (): Promise<void> => {
    setError('')
    const res = await props.ctx.remote.credentials.unset(props.name)
    if (!res.ok) { setError('凭据服务拒绝了清除'); return }
    props.onSaved()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <SettingsSecretField
        id={`media-studio-cred-${props.name}`}
        label={props.name}
        hint="保存进 dsh 凭据库（只写不读）；留空时也可用系统环境变量"
        text={draft}
        disabled={false}
        configured={info?.configured === true}
        stateLabel={info?.configured === true ? '已配置' : '未配置'}
        onEdit={setDraft}
      />
      <div style={row}>
        <button
          style={{ border: '1px solid rgba(128,128,128,0.45)', borderRadius: 6, padding: '3px 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'inherit' }}
          disabled={draft.trim() === ''}
          onClick={() => { void save() }}
        >保存</button>
        <button
          style={{ border: '1px solid rgba(128,128,128,0.45)', borderRadius: 6, padding: '3px 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'inherit' }}
          disabled={info?.configured !== true}
          onClick={() => { void clear() }}
        >清除</button>
        {error === '' ? null : <span style={status(true)}>{error}</span>}
      </div>
    </div>
  )
}

/** The credential card body. */
export function MediaStudioCredentialCard(props: { ctx: CredentialCardContext, view?: string }): JSX.Element {
  const ctx = props.ctx
  const [refs, setRefs] = useState<string[]>([])
  const [scopeStatus, setScopeStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [creds, setCreds] = useState<Record<string, CredentialInfoLike>>({})
  const [error, setError] = useState('')

  const refreshCreds = useCallback(async (nextRefs: string[]): Promise<void> => {
    if (nextRefs.length === 0) { setCreds({}); return }
    const res = await ctx.remote.credentials.describe(nextRefs)
    if (res.ok && res.value !== undefined) setCreds(res.value)
  }, [ctx])

  // The scope snapshot carries the entry's resolved section; re-derive the
  // referenced credential names whenever it changes (the user may edit
  // `apiKeyEnv` fields in the stock form above this card).
  useEffect(() => {
    let scope: ConfigFormScopeLike
    try {
      scope = ctx.configForms.get(NS)
    } catch {
      setScopeStatus('unavailable')
      return
    }
    const sync = (): void => {
      const snapshot = scope.getSnapshot()
      setScopeStatus(snapshot.status)
      const nextRefs = credentialRefs(snapshot.value)
      setRefs(nextRefs)
      void refreshCreds(nextRefs)
    }
    sync()
    return scope.subscribe(sync)
  }, [ctx, refreshCreds])

  // Credential writes from any surface republish on this event.
  useEffect(() => { void ctx.remote.$on('credentials/reference-updated', (payload) => {
    const name = typeof payload === 'string' ? payload : undefined
    if (name === undefined || refs.includes(name)) void refreshCreds(refs)
  }) }, [ctx, refs, refreshCreds])

  // The Plugins page dispatches `plugins.bundle.config` with `view: 'page'`
  // only; stay honest about other views instead of rendering a second form.
  if (props.view !== undefined && props.view !== 'page') return null as unknown as JSX.Element

  if (scopeStatus === 'unavailable') {
    return (
      <div style={container}>
        <span style={status(true)}>配置命名空间「{NS}」不可用——插件未在 profile 里加载。</span>
      </div>
    )
  }

  return (
    <div style={container}>
      {scopeStatus === 'loading' ? <span style={note}>正在读取配置…</span> : null}
      {refs.length === 0 && scopeStatus === 'ready'
        ? <span style={note}>（模型条目还没有引用任何凭据名；在上面的配置表单里给条目填「apiKeyEnv」）</span>
        : null}
      {refs.map(name => (
        <CredentialRow key={name} name={name} info={creds[name]} ctx={ctx} onSaved={() => { void refreshCreds(refs) }} />
      ))}
      {error === '' ? null : <span style={status(true)}>{error}</span>}
    </div>
  )
}

/**
 * Mount the card while the host serves this entry's configuration form — the
 * official `@gw/dsh-mimotts` pattern: the `plugins.bundle.config` keyed slot
 * (key = the npm package name) wrapped in `configForms.whileServed([ns], …)`.
 */
export function registerCredentialCard(rawCtx: SlotsContextLike): void {
  const ctx = rawCtx as SlotsContextLike & CredentialCardContext
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
    {
      name: 'plugins.bundle.config',
      key: PACKAGE_KEY,
      label: () => '媒体生成',
    },
    (ownerProps: SlotOwnerProps) => createElement(MediaStudioCredentialCard, {
      ctx,
      view: ownerProps.view,
    }),
  ))))
}
