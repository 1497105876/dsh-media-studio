/**
 * 插件的设置卡片 —— 挂在 插件详情页（plugins.bundle.config，key = 包名），
 * 挂载方式照抄 @gw/dsh-mimotts（configForms.whileServed 包裹）。
 *
 * 一张卡管完所有配置：
 *  - 模型条目（图片/视频两组）：服务商、地址、模型名，Key 输入框就在条目里，
 *    保存时 Key 走官方凭据通道（remote.credentials）存进 dsh 凭据库；
 *  - 默认参数：默认模型、输出目录、分辨率、画幅、视频时长等。
 *
 * 读写数据源是 configForms.get(ns) 的 scope（host 为本 entry 服务的配置投影，
 * ns = cordis.patch.yml 的 insert id）。保存用 scope.apply 的 path 寻址一次写入，
 * revision 冲突时提示并重读。host 半不用改：resolveApiKey 调用时自然拿到
 * 凭据库里的 Key。
 */
import { createElement, useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'

const NS = 'media-studio'
const PACKAGE_KEY = '@gw/dsh-media-studio'
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const PROVIDERS = ['agnes', 'openai', 'openai-videos']
const IMAGE_RESOLUTIONS = ['1K', '2K', '3K', '4K']
const IMAGE_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9']
const VIDEO_SIZES = ['720P', '1080P', '1K', '2K']
const VIDEO_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']

/** 一个模型条目的编辑草稿。keyDraft 是还没保存的 Key，不写进配置。 */
interface EntryDraft {
  id: string
  label: string
  provider: string
  model: string
  baseURL: string
  apiKeyEnv: string
  keyDraft: string
  keyConfigured: boolean
}

const box: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
const group: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.28)', borderRadius: 10,
  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
}
const groupTitle: CSSProperties = { fontSize: 13, fontWeight: 600, opacity: 0.9 }
const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const fieldCol: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 140px', minWidth: 120 }
const fieldLabel: CSSProperties = { fontSize: 11, opacity: 0.7 }
const input: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.4)', borderRadius: 6,
  padding: '4px 8px', fontSize: 12, background: 'transparent', color: 'inherit',
}
const btn: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.45)', borderRadius: 6, padding: '4px 12px',
  fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'inherit',
}
const btnPrimary: CSSProperties = { ...btn, fontWeight: 600 }
const tip = (bad: boolean): CSSProperties => ({
  fontSize: 12, minHeight: 14, color: bad ? 'rgb(255,105,97)' : 'rgb(52,199,89)',
})

// 凭据名不需要用户起：由条目 id 自动派生（MEDIA_STUDIO_<ID>），
// 保证过 dsh-credentials 的环境变量名语法校验。
function deriveRef(id: string): string {
  return `MEDIA_STUDIO_${id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`
}

// ---------- 小工具 ----------

function sectionOf(scope: any): Record<string, unknown> | undefined {
  const snap = scope?.getSnapshot?.()
  return snap?.status === 'ready' ? snap.value : undefined
}

function entriesOf(section: Record<string, unknown> | undefined, key: 'imageModels' | 'videoModels'): EntryDraft[] {
  const list = section?.[key]
  if (!Array.isArray(list)) return []
  return list.map((raw: any) => ({
    id: String(raw?.id ?? ''),
    label: String(raw?.label ?? ''),
    provider: String(raw?.provider ?? 'openai'),
    model: String(raw?.model ?? ''),
    baseURL: String(raw?.baseURL ?? ''),
    apiKeyEnv: String(raw?.apiKeyEnv ?? ''),
    keyDraft: '',
    keyConfigured: false,
  }))
}

function Field(props: { label: string, children: any }): JSX.Element {
  return (
    <label style={fieldCol}>
      <span style={fieldLabel}>{props.label}</span>
      {props.children}
    </label>
  )
}

function Select(props: { value: string, options: string[], onChange: (v: string) => void }): JSX.Element {
  return (
    <select style={input} value={props.value} onChange={e => props.onChange(e.target.value)}>
      {props.options.includes(props.value) ? null : <option value={props.value}>{props.value}</option>}
      {props.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// ---------- 模型条目小卡 ----------

function EntryCard(props: {
  entry: EntryDraft
  onChange: (patch: Partial<EntryDraft>) => void
  onRemove: () => void
}) {
  const e = props.entry
  return (
    <div style={{ ...group, padding: '8px 10px', gap: 6 }}>
      <div style={row}>
        <code style={{ fontSize: 12 }}>{e.id || '(新条目)'}</code>
        <span style={fieldLabel}>{e.label}</span>
        <span style={{ flex: 1 }} />
        <button style={btn} onClick={props.onRemove}>删除</button>
      </div>
      <div style={row}>
        <Field label="id（命令/工具里引用）">
          <input style={input} value={e.id} onChange={ev => props.onChange({ id: ev.target.value })} />
        </Field>
        <Field label="显示名">
          <input style={input} value={e.label} onChange={ev => props.onChange({ label: ev.target.value })} />
        </Field>
        <Field label="服务商">
          <Select value={e.provider} options={PROVIDERS} onChange={v => props.onChange({ provider: v })} />
        </Field>
      </div>
      <div style={row}>
        <Field label="模型名">
          <input style={input} value={e.model} onChange={ev => props.onChange({ model: ev.target.value })} />
        </Field>
        <Field label="接口地址（Base URL）">
          <input style={input} value={e.baseURL} onChange={ev => props.onChange({ baseURL: ev.target.value })} />
        </Field>
      </div>
      <SettingsSecretField
        id={`media-studio-key-${e.id || 'new'}`}
        label="API Key"
        hint="保存在 dsh 凭据库里（只写不读）；也可以改用系统环境变量"
        text={e.keyDraft}
        disabled={false}
        configured={e.keyConfigured}
        stateLabel={e.keyConfigured ? '已配置' : '未配置'}
        onEdit={text => props.onChange({ keyDraft: text })}
      />
    </div>
  )
}

// ---------- 主卡片 ----------

export function MediaStudioConfigCard(props: { ctx: any, view?: string }): JSX.Element {
  const { ctx } = props
  const [scope, setScope] = useState<any>(null)
  const [imageDrafts, setImageDrafts] = useState<EntryDraft[]>([])
  const [videoDrafts, setVideoDrafts] = useState<EntryDraft[]>([])
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // 从 scope 快照同步到本地草稿，然后异步补每个条目的 Key 配置状态
  // （Key 值只写不读，只能问凭据服务"这个凭据名配置过没有"）。
  const loadAll = useCallback(async (): Promise<void> => {
    const section = sectionOf(scope)
    if (section === undefined) return
    const img = entriesOf(section, 'imageModels')
    const vid = entriesOf(section, 'videoModels')
    setImageDrafts(img)
    setVideoDrafts(vid)
    setParams({ ...section })
    const names = [...new Set([...img, ...vid].map(d => d.apiKeyEnv.trim()).filter(n => n !== ''))]
    if (names.length === 0) return
    const res = await ctx.remote.credentials.describe(names)
    if (!res.ok || res.value === undefined) return
    const mark = (list: EntryDraft[]): EntryDraft[] =>
      list.map(d => ({ ...d, keyConfigured: res.value![d.apiKeyEnv.trim()]?.configured === true }))
    setImageDrafts(mark)
    setVideoDrafts(mark)
  }, [scope, ctx])

  useEffect(() => {
    try {
      setScope(ctx.configForms.get(NS))
    } catch {
      setError(`配置命名空间「${NS}」不可用——插件没在 profile 里加载。`)
      return
    }
  }, [ctx])

  useEffect(() => {
    if (scope === null) return
    void loadAll()
  }, [scope, loadAll])

  if (error !== '' && scope === null) {
    return <div style={box}><span style={tip(true)}>{error}</span></div>
  }

  const changeEntry = (kind: 'image' | 'video', index: number, patch: Partial<EntryDraft>): void => {
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }
  const removeEntry = (kind: 'image' | 'video', index: number): void => {
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => prev.filter((_, i) => i !== index))
  }
  const addEntry = (kind: 'image' | 'video'): void => {
    const fresh: EntryDraft = {
      id: '', label: '', provider: kind === 'image' ? 'openai' : 'openai-videos',
      model: '', baseURL: '', apiKeyEnv: '', keyDraft: '', keyConfigured: false,
    }
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => [...prev, fresh])
  }

  // 保存：参数和条目走 scope.apply 的 path 寻址一次写入；
  // 各条目里填了 Key 草稿的，顺手写进凭据库。
  const save = async (): Promise<void> => {
    if (scope === null) return
    const seenIds = new Set<string>()
    for (const d of [...imageDrafts, ...videoDrafts]) {
      if (!REF_PATTERN.test(d.id.trim())) { setError(`条目 id「${d.id || '(空)'}」必须是字母/数字/连字符`); return }
      if (seenIds.has(d.id.trim())) { setError(`条目 id「${d.id}」重复了，改一个不一样的`); return }
      seenIds.add(d.id.trim())
      if (d.model.trim() === '') { setError(`条目「${d.id}」的模型名不能为空`); return }
      if (d.apiKeyEnv.trim() !== '' && !REF_PATTERN.test(d.apiKeyEnv.trim())) {
        setError(`条目「${d.id}」的凭据名必须是合法环境变量名`); return
      }
    }
    setBusy(true)
    setError('')
    try {
      // 凭据名自动派生（空的时候）；用户在 patch 里手写过的保留不动
      const fillRef = (d: EntryDraft): EntryDraft =>
        d.apiKeyEnv.trim() === '' ? { ...d, apiKeyEnv: deriveRef(d.id) } : d
      const imageDraftsFilled = imageDrafts.map(fillRef)
      const videoDraftsFilled = videoDrafts.map(fillRef)
      setImageDrafts(imageDraftsFilled)
      setVideoDrafts(videoDraftsFilled)

      const snap = scope.getSnapshot()
      const strip = ({ keyDraft: _k, keyConfigured: _c, ...rest }: EntryDraft) => rest
      const ops = [
        { op: 'set', path: ['imageModels'], value: imageDraftsFilled.map(strip) },
        { op: 'set', path: ['videoModels'], value: videoDraftsFilled.map(strip) },
        ...Object.entries(params).map(([k, v]) => ({ op: 'set', path: [k], value: v })),
      ]
      const ok = await scope.apply(ops, snap.revision)
      if (!ok) { setError('保存被拒绝：配置已在别处修改，请点「重新加载」后重试'); return }
      // Key 草稿写凭据库（只写有输入的）
      for (const d of [...imageDraftsFilled, ...videoDraftsFilled]) {
        if (d.keyDraft.trim() !== '' && d.apiKeyEnv.trim() !== '') {
          const res = await ctx.remote.credentials.set(d.apiKeyEnv.trim(), d.keyDraft.trim())
          if (!res.ok) { setError(`「${d.id}」的 Key 写入凭据库失败`); return }
        }
      }
      await loadAll()
      setMessage('已保存，配置即时生效')
    } finally {
      setBusy(false)
    }
  }

  const setParam = (key: string, value: unknown): void => setParams(prev => ({ ...prev, [key]: value }))
  const param = (key: string): string => String(params[key] ?? '')

  return (
    <div style={box}>
      <div style={group}>
        <span style={groupTitle}>图片模型（{imageDrafts.length}）</span>
        {imageDrafts.map((d, i) => (
          <EntryCard key={i} entry={d}
            onChange={patch => changeEntry('image', i, patch)}
            onRemove={() => removeEntry('image', i)} />
        ))}
        <button style={btn} onClick={() => addEntry('image')}>+ 添加图片模型</button>
      </div>

      <div style={group}>
        <span style={groupTitle}>视频模型（{videoDrafts.length}）</span>
        {videoDrafts.map((d, i) => (
          <EntryCard key={i} entry={d}
            onChange={patch => changeEntry('video', i, patch)}
            onRemove={() => removeEntry('video', i)} />
        ))}
        <button style={btn} onClick={() => addEntry('video')}>+ 添加视频模型</button>
      </div>

      <div style={group}>
        <span style={groupTitle}>默认参数</span>
        <div style={row}>
          <Field label="默认图片模型">
            <Select value={param('defaultImageModel')} options={imageDrafts.map(d => d.id)}
              onChange={v => setParam('defaultImageModel', v)} />
          </Field>
          <Field label="默认视频模型">
            <Select value={param('defaultVideoModel')} options={videoDrafts.map(d => d.id)}
              onChange={v => setParam('defaultVideoModel', v)} />
          </Field>
        </div>
        <div style={row}>
          <Field label="输出目录（相对会话工作目录）">
            <input style={input} value={param('outputDir')} onChange={e => setParam('outputDir', e.target.value)} />
          </Field>
          <Field label="自动保存">
            <select style={input} value={params.autoSave === false ? 'no' : 'yes'}
              onChange={e => setParam('autoSave', e.target.value === 'yes')}>
              <option value="yes">开启</option>
              <option value="no">关闭</option>
            </select>
          </Field>
        </div>
        <div style={row}>
          <Field label="图片分辨率">
            <Select value={param('imageResolution')} options={IMAGE_RESOLUTIONS} onChange={v => setParam('imageResolution', v)} />
          </Field>
          <Field label="图片画幅">
            <Select value={param('imageAspectRatio')} options={IMAGE_RATIOS} onChange={v => setParam('imageAspectRatio', v)} />
          </Field>
        </div>
        <div style={row}>
          <Field label="视频时长（4–12 秒）">
            <input style={input} type="number" min={4} max={12}
              value={typeof params.videoSeconds === 'number' ? params.videoSeconds : 5}
              onChange={e => setParam('videoSeconds', Math.min(12, Math.max(4, Number(e.target.value) || 5)))} />
          </Field>
          <Field label="视频尺寸">
            <Select value={param('videoSize')} options={VIDEO_SIZES} onChange={v => setParam('videoSize', v)} />
          </Field>
          <Field label="视频画幅">
            <Select value={param('videoAspectRatio')} options={VIDEO_RATIOS} onChange={v => setParam('videoAspectRatio', v)} />
          </Field>
        </div>
      </div>

      <div style={row}>
        <button style={btnPrimary} disabled={busy} onClick={() => { void save() }}>{busy ? '保存中…' : '保存配置'}</button>
        <button style={btn} disabled={busy} onClick={() => { void loadAll() }}>重新加载</button>
        <span style={tip(error !== '')}>{error !== '' ? error : message}</span>
      </div>
    </div>
  )
}

/** host 服务这个配置页时，把卡片挂上插件详情页。 */
export function registerConfigCard(ctx: any): void {
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
    { name: 'plugins.bundle.config', key: PACKAGE_KEY, label: () => '媒体生成' },
    (ownerProps: { view?: string }) => createElement(MediaStudioConfigCard, { ctx, view: ownerProps.view }),
  ))))
}
