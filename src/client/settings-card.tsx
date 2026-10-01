/**
 * 插件的设置卡片 —— 挂在插件详情页（plugins.bundle.config，key = 包名）。
 *
 * 从常用到低频分三块：
 *  - 图片模型 / 视频模型：条目增删改。服务商下拉内置常见服务商（Agnes、
 *    OpenAI 生图 / Sora 2、Gemini、硅基流动、阿里云百炼、自定义），选中自动
 *    填好接口地址和参考模型名；API Key 在条目里填，保存时走官方凭据通道
 *    （remote.credentials）写进 dsh 凭据库（只写不读）；
 *  - 默认参数：默认模型、输出目录、图片/视频的分辨率画幅时长——这些只是
 *    默认值，对话里明确指定了参数时以对话指定的为准；
 *  - 高级：超时与轮询节奏，默认折叠，一般不用动。
 *
 * 布局是一行一行的表单（label 左、控件右），信息密度优先。
 *
 * 读写数据源是 configForms.get(ns) 的 scope（host 为本 entry 服务的配置投影，
 * ns = cordis.patch.yml 的 insert id）。保存用 scope.apply 的 path 寻址一次
 * 写入，revision 冲突时提示并重读。
 */
import { createElement, useCallback, useEffect, useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'

const NS = 'media-studio'
const PACKAGE_KEY = '@gw/dsh-media-studio'

/** 条目 id：字母/下划线开头，可含连字符（预设就有 agnes-image 这种）。 */
const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/
/** 凭据名必须是合法环境变量名，不能带连字符。 */
const ENV_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const IMAGE_RESOLUTIONS = ['1K', '2K', '3K', '4K']
const IMAGE_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9']
const VIDEO_SIZES = ['720P', '1080P', '1K', '2K']
const VIDEO_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']
const VIDEO_SECONDS = ['4', '5', '6', '8', '10', '12']

// ---------- 服务商预设 ----------

type MediaKind = 'image' | 'video'

/** 一个服务商预设：下拉选中后自动填充整条目，只有 Key 要自己填。 */
interface ProviderPreset {
  key: string
  label: string
  provider: 'agnes' | 'openai' | 'openai-videos'
  baseURL: string
  modelFor: (kind: MediaKind) => string
  suggestedIdFor: (kind: MediaKind) => string
  kinds: readonly MediaKind[]
}

/** 内置服务商预设（与 README「模型配置」表一致）；custom 只是占位，全手填。 */
const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    key: 'agnes', label: 'Agnes（免费额度）', provider: 'agnes',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    modelFor: kind => kind === 'image' ? 'agnes-image-2.5-flash' : 'agnes-video-2.5-flash',
    suggestedIdFor: kind => kind === 'image' ? 'agnes-image' : 'agnes-video',
    kinds: ['image', 'video'],
  },
  {
    key: 'openai-image', label: 'OpenAI 生图', provider: 'openai',
    baseURL: 'https://api.openai.com/v1',
    modelFor: () => 'gpt-image-1', suggestedIdFor: () => 'openai-image',
    kinds: ['image'],
  },
  {
    key: 'openai-video', label: 'OpenAI Sora 2', provider: 'openai-videos',
    baseURL: 'https://api.openai.com/v1',
    modelFor: () => 'sora-2', suggestedIdFor: () => 'openai-sora2',
    kinds: ['video'],
  },
  {
    key: 'gemini', label: 'Gemini 生图', provider: 'openai',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelFor: () => 'gemini-2.5-flash-image', suggestedIdFor: () => 'gemini-image',
    kinds: ['image'],
  },
  {
    key: 'siliconflow', label: '硅基流动', provider: 'openai',
    baseURL: 'https://api.siliconflow.cn/v1',
    modelFor: () => 'Kwai-Kolors/Kolors', suggestedIdFor: () => 'siliconflow-image',
    kinds: ['image'],
  },
  {
    key: 'dashscope', label: '阿里云百炼', provider: 'openai',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelFor: () => 'wanx2.1-t2i-turbo', suggestedIdFor: () => 'dashscope-image',
    kinds: ['image'],
  },
  {
    key: 'custom', label: '自定义（手填）', provider: 'openai', baseURL: '',
    modelFor: () => '', suggestedIdFor: () => '', kinds: ['image', 'video'],
  },
]

/** 加载已存条目时反推它属于哪个预设（provider + baseURL 命中即可，模型名允许被改过）。 */
function guessProviderKey(provider: string, baseURL: string): string {
  for (const preset of PROVIDER_PRESETS) {
    if (preset.key === 'custom') continue
    if (preset.provider === provider && preset.baseURL === baseURL) return preset.key
  }
  return 'custom'
}

/** 建议的 id 被占用时追加 -2、-3…… */
function uniqueSuggestedId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  for (let i = 2; ; i += 1) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
  }
}

/** 保存时模型条目从各自的草稿写入，params 里带的同名键要排除，避免旧快照覆盖新草稿。 */
const MODEL_KEYS = new Set(['imageModels', 'videoModels'])

/** 保存时要求非空的字符串参数（留空会让运行时拿到空串，报错也更难懂）。 */
const REQUIRED_PARAMS: Readonly<Record<string, string>> = {
  outputDir: '输出目录',
  imageResolution: '图片分辨率',
  imageAspectRatio: '图片画幅',
  videoSize: '视频尺寸',
  videoAspectRatio: '视频画幅',
}

/** 一个模型条目的编辑草稿。keyDraft 是还没保存的 Key；providerKey 只是
 *  UI 上记住选了哪个服务商预设；draftUid 是列表 key（id 会被用户编辑，
 *  不能拿来当 key，否则打字时组件重建丢焦点）——三者都不写进配置。 */
interface EntryDraft {
  draftUid: string
  id: string
  label: string
  providerKey: string
  provider: string
  model: string
  baseURL: string
  apiKeyEnv: string
  keyDraft: string
  keyConfigured: boolean
}

let draftUidSeq = 0
function newDraftUid(): string {
  draftUidSeq += 1
  return `draft-${Date.now().toString(36)}-${draftUidSeq}`
}

// ---------- 样式（行式布局） ----------

const box: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
const section: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.25)', borderRadius: 10,
  padding: '2px 14px 12px',
}
const summary: CSSProperties = {
  cursor: 'pointer', userSelect: 'none', fontSize: 13, fontWeight: 600, padding: '8px 0',
}
const badge: CSSProperties = {
  display: 'inline-block', marginLeft: 8, verticalAlign: '1px',
  fontSize: 10, fontWeight: 500, opacity: 0.65,
  border: '1px solid rgba(128,128,128,0.4)', borderRadius: 999, padding: '1px 8px',
}
const body: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
const sectionDesc: CSSProperties = { fontSize: 11, opacity: 0.55, lineHeight: 1.6 }
const entryBox: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.22)', borderRadius: 8,
  background: 'rgba(128,128,128,0.06)', padding: '8px 12px',
  display: 'flex', flexDirection: 'column', gap: 6,
}
/** 一行：label 左、控件右。 */
const line: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
const rowLabel: CSSProperties = { fontSize: 11, opacity: 0.7, flexShrink: 0, minWidth: 66, textAlign: 'right' }
const rowHead: CSSProperties = { ...rowLabel, fontWeight: 600, opacity: 0.6 }
const input: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.4)', borderRadius: 6,
  padding: '4px 8px', fontSize: 12, background: 'transparent', color: 'inherit',
  width: '100%', boxSizing: 'border-box',
}
const btn: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.45)', borderRadius: 6, padding: '4px 12px',
  fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'inherit',
}
const btnGhost: CSSProperties = {
  border: 'none', background: 'transparent', color: 'inherit', opacity: 0.6,
  fontSize: 12, cursor: 'pointer', padding: '2px 6px',
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

// ---------- 通用小组件 ----------

function sectionOf(scope: any): Record<string, unknown> | undefined {
  const snap = scope?.getSnapshot?.()
  return snap?.status === 'ready' ? snap.value : undefined
}

function entriesOf(section: Record<string, unknown> | undefined, key: 'imageModels' | 'videoModels', kind: MediaKind): EntryDraft[] {
  const list = section?.[key]
  if (!Array.isArray(list)) return []
  return list.map((raw: any) => {
    const provider = String(raw?.provider ?? 'openai')
    const baseURL = String(raw?.baseURL ?? '')
    return {
      draftUid: newDraftUid(),
      id: String(raw?.id ?? ''),
      label: String(raw?.label ?? ''),
      providerKey: guessProviderKey(provider, baseURL),
      provider,
      model: String(raw?.model ?? ''),
      baseURL,
      apiKeyEnv: String(raw?.apiKeyEnv ?? ''),
      keyDraft: '',
      keyConfigured: false,
    }
  })
}

/** 一个分区：可折叠（details/summary 原生行为），标题 + 计数徽标 + 说明 + 内容。 */
function Section(props: { title: string, badge?: string, desc?: string, defaultOpen?: boolean, children: any }): JSX.Element {
  return (
    <details open={props.defaultOpen !== false} style={section}>
      <summary style={summary}>
        {props.title}
        {props.badge === undefined ? null : <span style={badge}>{props.badge}</span>}
      </summary>
      <div style={body}>
        {props.desc === undefined ? null : <span style={sectionDesc}>{props.desc}</span>}
        {props.children}
      </div>
    </details>
  )
}

/** 行内一组：小标签 + 控件（控件撑满剩余宽度）。hint 走 title 悬停提示。 */
function Slot(props: { label: string, title?: string, flex?: string, children: any }): JSX.Element {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: props.flex ?? '1 1 140px', minWidth: 0 }} title={props.title}>
      <span style={rowLabel}>{props.label}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex' }}>{props.children}</span>
    </label>
  )
}

function Line(props: { children: any }): JSX.Element {
  return <div style={line}>{props.children}</div>
}

function Select(props: { value: string, options: readonly string[], onChange: (v: string) => void }): JSX.Element {
  return (
    <select style={input} value={props.value} onChange={e => props.onChange(e.target.value)}>
      {props.options.includes(props.value) ? null : <option value={props.value}>{props.value}</option>}
      {props.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

/** 服务商下拉：按图片/视频组过滤预设；未选时显示占位提示。 */
function ProviderSelect(props: { kind: MediaKind, value: string, onChange: (v: string) => void }): JSX.Element {
  const options = PROVIDER_PRESETS.filter(p => p.kinds.includes(props.kind))
  const known = options.some(p => p.key === props.value)
  return (
    <select style={input} value={props.value}
      onChange={e => { if (e.target.value !== '') props.onChange(e.target.value) }}>
      {props.value === '' ? <option value="" disabled>选择服务商，自动填好地址和模型</option> : null}
      {!known && props.value !== '' ? <option value={props.value}>{props.value}</option> : null}
      {options.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
    </select>
  )
}

/** 可下拉的输入框：常见档位点选，也允许手输服务商支持的自定义值。 */
function ComboBox(props: { value: string, options: readonly string[], onChange: (v: string) => void }): JSX.Element {
  const listId = useId()
  return (
    <>
      <input style={input} value={props.value} list={listId} onChange={e => props.onChange(e.target.value)} />
      <datalist id={listId}>
        {props.options.map(o => <option key={o} value={o} />)}
      </datalist>
    </>
  )
}

// ---------- 模型条目小卡 ----------

function EntryCard(props: {
  entry: EntryDraft
  kind: MediaKind
  onChange: (patch: Partial<EntryDraft>) => void
  /** 选了服务商预设：整条目自动填充（provider/baseURL/model/label/id）。 */
  onProviderChange: (presetKey: string) => void
  onRemove: () => void
}) {
  const e = props.entry
  return (
    <div style={entryBox}>
      <Line>
        <Slot label="服务商" title="选中即自动填充接口地址和参考模型名，只需再填 API Key；下拉没有的服务商选「自定义」手填" flex="1 1 260px">
          <ProviderSelect kind={props.kind} value={e.providerKey} onChange={v => props.onProviderChange(v)} />
        </Slot>
      </Line>
      <Line>
        <Slot label="id" title="对话 / 工具里引用的名字，如 agnes-image；字母或下划线开头，可含连字符" flex="1 1 180px">
          <input style={input} value={e.id} onChange={ev => props.onChange({ id: ev.target.value })} />
        </Slot>
        <Slot label="显示名" title="可选，推送消息里展示" flex="1 1 180px">
          <input style={input} value={e.label} onChange={ev => props.onChange({ label: ev.target.value })} />
        </Slot>
      </Line>
      <Line>
        <Slot label="模型名">
          <input style={input} value={e.model} onChange={ev => props.onChange({ model: ev.target.value })} />
        </Slot>
      </Line>
      <Line>
        <Slot label="接口地址" title="OpenAI 兼容的 Base URL，一般以 /v1 结尾">
          <input style={input} value={e.baseURL} onChange={ev => props.onChange({ baseURL: ev.target.value })} />
        </Slot>
      </Line>
      <SettingsSecretField
        id={`media-studio-key-${e.draftUid}`}
        label="API Key"
        hint="保存在 dsh 凭据库里（只写不读）；也可以改用系统环境变量"
        text={e.keyDraft}
        disabled={false}
        configured={e.keyConfigured}
        stateLabel={e.keyConfigured ? '已配置' : '未配置'}
        onEdit={text => props.onChange({ keyDraft: text })}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnGhost} onClick={props.onRemove}>删除</button>
      </div>
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
    const img = entriesOf(section, 'imageModels', 'image')
    const vid = entriesOf(section, 'videoModels', 'video')
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

  const changeEntry = (kind: MediaKind, index: number, patch: Partial<EntryDraft>): void => {
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }
  const removeEntry = (kind: MediaKind, index: number): void => {
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => prev.filter((_, i) => i !== index))
  }
  const addEntry = (kind: MediaKind): void => {
    const fresh: EntryDraft = {
      draftUid: newDraftUid(),
      id: '', label: '', providerKey: '', provider: kind === 'image' ? 'openai' : 'openai-videos',
      model: '', baseURL: '', apiKeyEnv: '', keyDraft: '', keyConfigured: false,
    }
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => [...prev, fresh])
  }
  // 选服务商：自动填充整条目（主动选择=要用这家，覆盖已有地址和模型名）；
  // 显示名和 id 只在为空时补建议值，id 被占用就追加序号。
  const applyPreset = (kind: MediaKind, index: number, key: string): void => {
    const preset = PROVIDER_PRESETS.find(p => p.key === key)
    if (preset === undefined) return
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => prev.map((d, i) => {
      if (i !== index) return d
      if (preset.key === 'custom') return { ...d, providerKey: 'custom' }
      const patch: Partial<EntryDraft> = {
        providerKey: key,
        provider: preset.provider,
        baseURL: preset.baseURL,
        model: preset.modelFor(kind),
      }
      if (d.label.trim() === '') patch.label = preset.label
      if (d.id.trim() === '') {
        const taken = new Set([...prev].map(x => x.id.trim()))
        patch.id = uniqueSuggestedId(preset.suggestedIdFor(kind), taken)
      }
      return { ...d, ...patch }
    }))
  }

  const setParam = (key: string, value: unknown): void => setParams(prev => ({ ...prev, [key]: value }))
  const param = (key: string): string => String(params[key] ?? '')
  /** 数字参数：解析失败或低于下限时忽略本次输入。 */
  const setNumberParam = (key: string, raw: string, min: number): void => {
    const n = Math.round(Number(raw))
    if (Number.isFinite(n) && n >= min) setParam(key, n)
  }

  // 保存：参数和条目走 scope.apply 的 path 寻址一次写入；
  // 各条目里填了 Key 草稿的，顺手写进凭据库。
  const save = async (): Promise<void> => {
    if (scope === null) return
    const seenIds = new Set<string>()
    for (const d of [...imageDrafts, ...videoDrafts]) {
      if (!ID_PATTERN.test(d.id.trim())) {
        setError(`条目 id「${d.id || '(空)'}」要以字母或下划线开头，只能含字母、数字、下划线、连字符`); return
      }
      if (seenIds.has(d.id.trim())) { setError(`条目 id「${d.id}」重复了，改一个不一样的`); return }
      seenIds.add(d.id.trim())
      if (d.model.trim() === '') { setError(`条目「${d.id}」的模型名不能为空`); return }
      if (d.baseURL.trim() === '') { setError(`条目「${d.id}」的接口地址不能为空`); return }
      if (d.apiKeyEnv.trim() !== '' && !ENV_PATTERN.test(d.apiKeyEnv.trim())) {
        setError(`条目「${d.id}」的凭据名必须是合法环境变量名（不能带连字符）`); return
      }
    }
    for (const [key, label] of Object.entries(REQUIRED_PARAMS)) {
      if (String(params[key] ?? '').trim() === '') { setError(`「${label}」不能为空`); return }
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
      const strip = ({ draftUid: _u, keyDraft: _k, keyConfigured: _c, providerKey: _p, ...rest }: EntryDraft) => rest
      const ops = [
        { op: 'set', path: ['imageModels'], value: imageDraftsFilled.map(strip) },
        { op: 'set', path: ['videoModels'], value: videoDraftsFilled.map(strip) },
        ...Object.entries(params)
          .filter(([k]) => !MODEL_KEYS.has(k))
          .map(([k, v]) => ({ op: 'set', path: [k], value: v })),
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

  return (
    <div style={box}>
      <Section title="图片模型" badge={`${imageDrafts.length} 个`}
        desc="选服务商自动填好地址和模型，填上 API Key 就能用；对话和工具按 id 引用条目。">
        {imageDrafts.map((d, i) => (
          <EntryCard key={d.draftUid} entry={d} kind="image"
            onChange={patch => changeEntry('image', i, patch)}
            onProviderChange={key => applyPreset('image', i, key)}
            onRemove={() => removeEntry('image', i)} />
        ))}
        <div><button style={btn} onClick={() => addEntry('image')}>+ 添加图片模型</button></div>
      </Section>

      <Section title="视频模型" badge={`${videoDrafts.length} 个`}
        desc="同上；视频任务默认后台生成，完成后推送进会话。">
        {videoDrafts.map((d, i) => (
          <EntryCard key={d.draftUid} entry={d} kind="video"
            onChange={patch => changeEntry('video', i, patch)}
            onProviderChange={key => applyPreset('video', i, key)}
            onRemove={() => removeEntry('video', i)} />
        ))}
        <div><button style={btn} onClick={() => addEntry('video')}>+ 添加视频模型</button></div>
      </Section>

      <Section title="默认参数"
        desc="这里配置的只是默认值：生成时在对话里明确指定了参数（模型、分辨率、画幅、时长等），以对话指定的为准。输出目录支持 ~ 开头，展开到用户主目录，默认 ~/.dsh/media-studio。">
        <Line>
          <Slot label="默认图片模型" title="对话里没指定 model 时的兜底">
            <Select value={param('defaultImageModel')} options={imageDrafts.map(d => d.id)}
              onChange={v => setParam('defaultImageModel', v)} />
          </Slot>
          <Slot label="默认视频模型" title="对话里没指定 model 时的兜底">
            <Select value={param('defaultVideoModel')} options={videoDrafts.map(d => d.id)}
              onChange={v => setParam('defaultVideoModel', v)} />
          </Slot>
        </Line>
        <Line>
          <Slot label="输出目录" title="支持 ~ 开头（展开到用户主目录）；相对路径基于会话工作目录" flex="3 1 260px">
            <input style={input} value={param('outputDir')} onChange={e => setParam('outputDir', e.target.value)} />
          </Slot>
          <Slot label="自动保存" title="图片是否额外落盘一份（视频始终落盘，播放需要文件）" flex="1 1 130px">
            <select style={input} value={params.autoSave === false ? 'no' : 'yes'}
              onChange={e => setParam('autoSave', e.target.value === 'yes')}>
              <option value="yes">开启</option>
              <option value="no">关闭</option>
            </select>
          </Slot>
        </Line>
        <Line>
          <span style={rowHead}>图片</span>
          <Slot label="分辨率" title="常用 1K–4K，也可手输服务商支持的其他档位">
            <ComboBox value={param('imageResolution')} options={IMAGE_RESOLUTIONS}
              onChange={v => setParam('imageResolution', v)} />
          </Slot>
          <Slot label="画幅" title="宽高比，如 16:9 横、9:16 竖">
            <ComboBox value={param('imageAspectRatio')} options={IMAGE_RATIOS}
              onChange={v => setParam('imageAspectRatio', v)} />
          </Slot>
        </Line>
        <Line>
          <span style={rowHead}>视频</span>
          <Slot label="时长" title="4–12 秒">
            <ComboBox value={param('videoSeconds')} options={VIDEO_SECONDS}
              onChange={v => {
                if (v.trim() === '') return
                const n = Math.round(Number(v))
                if (Number.isFinite(n)) setParam('videoSeconds', Math.min(12, Math.max(4, n)))
              }} />
          </Slot>
          <Slot label="尺寸" title="常用 720P / 1080P / 1K / 2K">
            <ComboBox value={param('videoSize')} options={VIDEO_SIZES}
              onChange={v => setParam('videoSize', v)} />
          </Slot>
          <Slot label="画幅" title="宽高比">
            <ComboBox value={param('videoAspectRatio')} options={VIDEO_RATIOS}
              onChange={v => setParam('videoAspectRatio', v)} />
          </Slot>
        </Line>
      </Section>

      <Section title="高级" desc="网络与轮询节奏（毫秒），一般不用改；保存后即时生效。" defaultOpen={false}>
        <Line>
          <Slot label="请求超时" title="单次生成 HTTP 请求的最长等待（毫秒）">
            <input style={input} type="number" min={1000} step={1000}
              value={param('requestTimeoutMs')}
              onChange={e => setNumberParam('requestTimeoutMs', e.target.value, 1000)} />
          </Slot>
          <Slot label="轮询间隔" title="查询视频任务进度的间隔（毫秒）">
            <input style={input} type="number" min={200} step={500}
              value={param('videoPollIntervalMs')}
              onChange={e => setNumberParam('videoPollIntervalMs', e.target.value, 200)} />
          </Slot>
          <Slot label="轮询上限" title="超过此时长任务还没完成，按失败处理（毫秒）">
            <input style={input} type="number" min={1000} step={10000}
              value={param('videoPollTimeoutMs')}
              onChange={e => setNumberParam('videoPollTimeoutMs', e.target.value, 1000)} />
          </Slot>
        </Line>
      </Section>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
