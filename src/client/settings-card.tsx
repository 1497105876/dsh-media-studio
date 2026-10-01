/**
 * 插件详情页的凭据卡片。挂载位置和写法完全照抄 @gw/dsh-mimotts：
 * plugins.bundle.config（key = 包名）+ configForms.get(ns) 拿配置快照。
 *
 * 自动配置表单负责模型条目等 volatile 配置；这个卡片只管 API Key——
 * key 永远不走在配置读取里，单独走官方凭据通道 remote.credentials 存取。
 */
import { createElement, useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'

// cordis.patch.yml 里的 insert id，也是 configForms 的 namespace
const NS = 'media-studio'
// plugins.bundle.config 是 keyed slot，key 固定为 npm 包名
const PACKAGE_KEY = '@gw/dsh-media-studio'
// 凭据名必须是合法环境变量名（dsh-credentials 的 REF_PATTERN）
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const box: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 }
const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }
const note: CSSProperties = { fontSize: 11, opacity: 0.7 }
const tip = (bad: boolean): CSSProperties => ({
  fontSize: 12, minHeight: 14, color: bad ? 'rgb(255,105,97)' : 'rgb(52,199,89)',
})
const btn: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.45)', borderRadius: 6, padding: '3px 12px',
  fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'inherit',
}

/** 从配置快照里收集所有条目引用的凭据名（imageModels + videoModels 的 apiKeyEnv）。 */
function collectRefs(section: Record<string, unknown> | undefined): string[] {
  const names = new Set<string>()
  if (section === undefined) return []
  for (const key of ['imageModels', 'videoModels']) {
    const list = section[key]
    if (!Array.isArray(list)) continue
    for (const entry of list as { apiKeyEnv?: unknown }[]) {
      const name = typeof entry?.apiKeyEnv === 'string' ? entry.apiKeyEnv.trim() : ''
      if (name !== '' && REF_PATTERN.test(name)) names.add(name)
    }
  }
  return [...names]
}

/** 单个凭据行：官方 SettingsSecretField 控件 + 行内保存/清除。 */
function CredentialRow(props: {
  name: string
  configured: boolean
  onSave: (key: string) => Promise<boolean>
  onClear: () => Promise<boolean>
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const save = async (): Promise<void> => {
    if (draft.trim() === '') return
    if (!await props.onSave(draft.trim())) { setError('凭据服务拒绝了写入'); return }
    setDraft('')
    setError('')
  }
  const clear = async (): Promise<void> => {
    if (!await props.onClear()) { setError('凭据服务拒绝了清除'); return }
    setError('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <SettingsSecretField
        id={`media-studio-cred-${props.name}`}
        label={props.name}
        hint="保存进 dsh 凭据库（只写不读）；也可以改用系统环境变量"
        text={draft}
        disabled={false}
        configured={props.configured}
        stateLabel={props.configured ? '已配置' : '未配置'}
        onEdit={setDraft}
      />
      <div style={row}>
        <button style={btn} disabled={draft.trim() === ''} onClick={() => { void save() }}>保存</button>
        <button style={btn} disabled={!props.configured} onClick={() => { void clear() }}>清除</button>
        {error === '' ? null : <span style={tip(true)}>{error}</span>}
      </div>
    </div>
  )
}

/** 卡片本体：从配置快照读凭据名，逐个查状态、写入/清除。 */
export function MediaStudioCredentialCard(props: { ctx: any, view?: string }): JSX.Element {
  const { ctx } = props
  const [refs, setRefs] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [creds, setCreds] = useState<Record<string, { configured: boolean, source?: string }>>({})
  const [error, setError] = useState('')

  // 查一轮凭据状态（是否已在凭据库里配置）
  const refresh = useCallback(async (names: string[]): Promise<void> => {
    if (names.length === 0) { setCreds({}); return }
    const res = await ctx.remote.credentials.describe(names)
    if (res.ok && res.value !== undefined) setCreds(res.value)
  }, [ctx])

  // configForms 的 scope 快照就是 host 为这个 entry 服务的配置投影。
  // 订阅它：自动表单里改了 apiKeyEnv，下面的凭据行跟着变。
  useEffect(() => {
    let scope: any
    try {
      scope = ctx.configForms.get(NS)
    } catch {
      setStatus('unavailable')
      return
    }
    const sync = (): void => {
      const snap = scope.getSnapshot()
      setStatus(snap.status)
      const names = collectRefs(snap.value)
      setRefs(names)
      void refresh(names)
    }
    sync()
    return scope.subscribe(sync)
  }, [ctx, refresh])

  // 凭据在别处被写/删时（包括本卡片），事件会推过来
  useEffect(() => { void ctx.remote.$on('credentials/reference-updated', (ref: unknown) => {
    if (typeof ref !== 'string' || refs.includes(ref)) void refresh(refs)
  }) }, [ctx, refs, refresh])

  // 插件详情页只派发 view: 'page'，其他视图不渲染
  if (props.view !== undefined && props.view !== 'page') return null as unknown as JSX.Element

  if (status === 'unavailable') {
    return <div style={box}><span style={tip(true)}>配置命名空间「{NS}」不可用——插件没在 profile 里加载。</span></div>
  }

  const setKey = (name: string) => async (key: string): Promise<boolean> =>
    (await ctx.remote.credentials.set(name, key)).ok
  const clearKey = (name: string) => async (): Promise<boolean> =>
    (await ctx.remote.credentials.unset(name)).ok

  return (
    <div style={box}>
      {status === 'loading' ? <span style={note}>正在读取配置…</span> : null}
      {refs.length === 0 && status === 'ready'
        ? <span style={note}>（模型条目还没有引用凭据名；在上面的配置表单里给条目填 apiKeyEnv）</span>
        : null}
      {refs.map(name => (
        <CredentialRow
          key={name}
          name={name}
          configured={creds[name]?.configured === true}
          onSave={setKey(name)}
          onClear={clearKey(name)}
        />
      ))}
      {error === '' ? null : <span style={tip(true)}>{error}</span>}
    </div>
  )
}

/** host 服务这个配置页时，把卡片挂上插件详情页。 */
export function registerCredentialCard(ctx: any): void {
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
    { name: 'plugins.bundle.config', key: PACKAGE_KEY, label: () => '媒体生成' },
    (ownerProps: { view?: string }) => createElement(MediaStudioCredentialCard, {
      ctx,
      view: ownerProps.view,
    }),
  ))))
}
