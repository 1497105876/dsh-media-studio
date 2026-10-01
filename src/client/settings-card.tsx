/**
 * 插件的设置卡片 —— 挂在插件详情页（plugins.bundle.config，key = 包名）。
 *
 * 样式与保存通道全部对齐官方设置页（照 @gw/dsh-mimotts 的官方模式）：
 *  - 卡片壳是官方 <SettingsForm>（保存按钮 / 只读提示 / 失败提示 / 卸载丢弃）；
 *  - 文本与数字字段用官方 <SettingsValueField>，Key 用官方 <SettingsSecretField>；
 *  - 保存走 scope.mutate(ops, revision)——这是 host 认的唯一写通道，
 *    之前手写的 scope.apply 不存在，是「点了保存没反应」的根因。
 *
 * 功能结构（自绘部分）：
 *  - 图片模型 / 视频模型：条目增删改，服务商下拉内置常见服务商（Agnes、
 *    OpenAI 生图 / Sora 2、Gemini、硅基流动、阿里云百炼、自定义），选中自动
 *    填好接口地址和参考模型名；API Key 保存时走 remote.credentials 写凭据库；
 *  - 默认参数：默认模型、输出目录、图片/视频的分辨率画幅时长——这些只是
 *    默认值，对话里明确指定了参数时以对话指定的为准；
 *  - 高级：超时与轮询节奏。
 *
 * 四个分区默认全部折叠，点标题展开。
 */
import { createElement, useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SettingsForm, SettingsSecretField, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'

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
const VIDEO_SECONDS = ['4', '5', '6', '7', '8', '9', '10', '11', '12']

const PROVIDER_ADAPTERS = ['agnes', 'openai', 'openai-videos']

// ---------- 服务商预设 ----------

type MediaKind = 'image' | 'video'

/** 一个服务商预设：下拉选中后自动填充整条目，只有 Key 要自己填。 */
interface ProviderPreset {
  key: string
  /** 下拉里显示的名字（可以带说明）。 */
  label: string
  /** 建议的条目显示名（干净版，不带说明括号）。 */
  labelFor: (kind: MediaKind) => string
  provider: 'agnes' | 'openai' | 'openai-videos'
  baseURL: string
  modelFor: (kind: MediaKind) => string
  suggestedIdFor: (kind: MediaKind) => string
  kinds: readonly MediaKind[]
}

/** 内置服务商预设（与 README「模型配置」表一致）；custom 只是占位，全手填。 */
const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    key: 'agnes', label: 'Agnes（免费额度）',
    labelFor: kind => kind === 'image' ? 'Agnes 生图' : 'Agnes 生视频',
    provider: 'agnes',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    modelFor: kind => kind === 'image' ? 'agnes-image-2.5-flash' : 'agnes-video-2.5-flash',
    suggestedIdFor: kind => kind === 'image' ? 'agnes-image' : 'agnes-video',
    kinds: ['image', 'video'],
  },
  {
    key: 'openai-image', label: 'OpenAI 生图', labelFor: () => 'OpenAI 生图', provider: 'openai',
    baseURL: 'https://api.openai.com/v1',
    modelFor: () => 'gpt-image-1', suggestedIdFor: () => 'openai-image',
    kinds: ['image'],
  },
  {
    key: 'openai-video', label: 'OpenAI Sora 2', labelFor: () => 'OpenAI Sora 2', provider: 'openai-videos',
    baseURL: 'https://api.openai.com/v1',
    modelFor: () => 'sora-2', suggestedIdFor: () => 'openai-sora2',
    kinds: ['video'],
  },
  {
    key: 'gemini', label: 'Gemini 生图', labelFor: () => 'Gemini 生图', provider: 'openai',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelFor: () => 'gemini-2.5-flash-image', suggestedIdFor: () => 'gemini-image',
    kinds: ['image'],
  },
  {
    key: 'siliconflow', label: '硅基流动', labelFor: () => '硅基流动', provider: 'openai',
    baseURL: 'https://api.siliconflow.cn/v1',
    modelFor: () => 'Kwai-Kolors/Kolors', suggestedIdFor: () => 'siliconflow-image',
    kinds: ['image'],
  },
  {
    key: 'dashscope', label: '阿里云百炼', labelFor: () => '阿里云百炼', provider: 'openai',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelFor: () => 'wanx2.1-t2i-turbo', suggestedIdFor: () => 'dashscope-image',
    kinds: ['image'],
  },
  {
    key: 'custom', label: '自定义（手填）', labelFor: () => '', provider: 'openai', baseURL: '',
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
}

let draftUidSeq = 0
function newDraftUid(): string {
  draftUidSeq += 1
  return `draft-${Date.now().toString(36)}-${draftUidSeq}`
}

// ---------- 样式（官方字段组件之外的自绘部分） ----------

const box: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
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
const body: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 2 }
const sectionDesc: CSSProperties = { fontSize: 11, opacity: 0.55, lineHeight: 1.6 }
const entryBox: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.22)', borderRadius: 8,
  background: 'rgba(128,128,128,0.06)', padding: '10px 12px',
  display: 'flex', flexDirection: 'column', gap: 10,
}
const btn: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.45)', borderRadius: 6, padding: '4px 12px',
  fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'inherit',
}
/** 与官方 SettingsValueField 同构的选择行：label 上、控件下、hint 再下。 */
const fieldBox: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const fieldLabel: CSSProperties = { fontSize: 12, opacity: 0.8 }
const fieldHint: CSSProperties = { fontSize: 11, opacity: 0.5, lineHeight: 1.5 }
const input: CSSProperties = {
  border: '1px solid rgba(128,128,128,0.4)', borderRadius: 6,
  padding: '5px 8px', fontSize: 12, background: 'transparent', color: 'inherit',
  width: '100%', boxSizing: 'border-box',
}
const tip = (bad: boolean): CSSProperties => ({
  fontSize: 12, color: bad ? 'rgb(255,105,97)' : 'rgb(52,199,89)', lineHeight: 1.5,
})

// 凭据名不需要用户起：由条目 id 自动派生（MEDIA_STUDIO_<ID>），
// 保证过 dsh-credentials 的环境变量名语法校验。
function deriveRef(id: string): string {
  return `MEDIA_STUDIO_${id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`
}

/** 凭据库只写不读；确认弹窗在个别嵌入环境可能被禁，禁了就当作确认。 */
function safeConfirm(message: string): boolean {
  try { return window.confirm(message) } catch { return true }
}

// ---------- 自绘小组件 ----------

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
    }
  })
}

/** 一个分区：默认折叠，点标题展开；标题 + 计数徽标 + 说明 + 内容。 */
function Section(props: { title: string, badge?: string, desc?: string, children: any }): JSX.Element {
  return (
    <details style={section}>
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

/** 与官方字段行同构的选择框行（SettingsValueField 是文本框，select 需要自绘）。
 *  optionLabels 可选：给部分 value 配中文显示名（如 yes/no → 开启/关闭）。 */
function SelectRow(props: {
  id: string, label: string, hint?: string, value: string,
  options: readonly string[], optionLabels?: Record<string, string>,
  disabled?: boolean, onChange: (v: string) => void,
}): JSX.Element {
  return (
    <div style={fieldBox}>
      <label style={fieldLabel} htmlFor={props.id}>{props.label}</label>
      <select id={props.id} style={input} value={props.value} disabled={props.disabled}
        onChange={e => props.onChange(e.target.value)}>
        {props.options.includes(props.value) ? null : <option value={props.value}>{props.value}</option>}
        {props.options.map(o => <option key={o} value={o}>{props.optionLabels?.[o] ?? o}</option>)}
      </select>
      {props.hint === undefined ? null : <span style={fieldHint}>{props.hint}</span>}
    </div>
  )
}

/** 服务商下拉：按图片/视频组过滤预设；未选时显示占位提示。 */
function ProviderSelect(props: { kind: MediaKind, value: string, disabled?: boolean, onChange: (v: string) => void }): JSX.Element {
  const options = PROVIDER_PRESETS.filter(p => p.kinds.includes(props.kind))
  const known = options.some(p => p.key === props.value)
  return (
    <select style={input} value={props.value} disabled={props.disabled}
      onChange={e => { if (e.target.value !== '') props.onChange(e.target.value) }}>
      {props.value === '' ? <option value="" disabled>选择服务商，自动填好地址和模型</option> : null}
      {!known && props.value !== '' ? <option value={props.value}>{props.value}</option> : null}
      {options.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
    </select>
  )
}

/** 官方 SettingsValueField 的本地包装：本卡片不做「覆盖/重置」语义，
 *  恒定非覆盖、非无效，徽标与重置按钮自然不渲染。 */
function ValueField(props: {
  id: string, label: string, hint?: string, text: string, numeric?: boolean,
  placeholder?: string, disabled?: boolean, onEdit: (text: string) => void,
}): JSX.Element {
  return (
    <SettingsValueField
      id={props.id} label={props.label} text={props.text}
      {...(props.hint === undefined ? {} : { hint: props.hint })}
      {...(props.placeholder === undefined ? {} : { placeholder: props.placeholder })}
      numeric={props.numeric === true}
      disabled={props.disabled === true}
      onEdit={props.onEdit}
      overridden={false} invalid={false}
      overriddenLabel="" resetLabel="" invalidLabel=""
      onReset={() => {}} />
  )
}

// ---------- 模型条目小卡 ----------

function EntryCard(props: {
  entry: EntryDraft
  kind: MediaKind
  /** 凭据名 → 是否已在凭据库配置过 Key（loadAll 异步查询的结果）。 */
  keyStatus: Record<string, boolean>
  disabled: boolean
  onChange: (patch: Partial<EntryDraft>) => void
  /** 选了服务商预设：整条目自动填充（provider/baseURL/model/label/id）。 */
  onProviderChange: (presetKey: string) => void
  onRemove: () => void
}) {
  const e = props.entry
  const uid = e.draftUid
  const configured = props.keyStatus[e.apiKeyEnv.trim()] === true
  const keyFilled = e.keyDraft.trim() !== ''
  const refName = e.apiKeyEnv.trim() !== ''
    ? e.apiKeyEnv.trim()
    : e.id.trim() !== '' ? deriveRef(e.id) : '保存时按 id 自动派生'
  return (
    <div style={entryBox}>
      <div style={fieldBox}>
        <label style={fieldLabel} htmlFor={`ms-${uid}-provider`}>服务商</label>
        <ProviderSelect kind={props.kind} value={e.providerKey} disabled={props.disabled}
          onChange={v => props.onProviderChange(v)} />
        <span style={fieldHint}>选中即自动填充接口地址和参考模型名；下拉没有的服务商选「自定义」手填</span>
      </div>
      {e.providerKey === 'custom' ? (
        <SelectRow id={`ms-${uid}-adapter`} label="适配器"
          hint="接口协议：agnes=Agnes 专有；openai=OpenAI 兼容图片接口；openai-videos=OpenAI 风格异步视频接口"
          value={e.provider} options={PROVIDER_ADAPTERS} disabled={props.disabled}
          onChange={v => props.onChange({ provider: v })} />
      ) : null}
      <ValueField id={`ms-${uid}-id`} label="id"
        hint="对话 / 工具里引用的名字；凭据按 id 派生，改 id 后可能需要重新填 API Key"
        text={e.id} disabled={props.disabled}
        onEdit={text => props.onChange({ id: text })} />
      <ValueField id={`ms-${uid}-label`} label="显示名"
        hint="可选，推送消息里展示"
        text={e.label} disabled={props.disabled}
        onEdit={text => props.onChange({ label: text })} />
      <ValueField id={`ms-${uid}-model`} label="模型名"
        text={e.model} disabled={props.disabled}
        onEdit={text => props.onChange({ model: text })} />
      <ValueField id={`ms-${uid}-baseurl`} label="接口地址（Base URL）"
        hint="OpenAI 兼容地址，一般以 /v1 结尾"
        text={e.baseURL} disabled={props.disabled}
        onEdit={text => props.onChange({ baseURL: text })} />
      <SettingsSecretField
        id={`ms-${uid}-key`}
        label="API Key"
        hint={`写入凭据库「${refName}」（只写不读）；也可以改用系统环境变量`}
        text={e.keyDraft}
        disabled={props.disabled}
        configured={configured || keyFilled}
        stateLabel={keyFilled ? '已输入，保存后生效' : configured ? '已配置' : '未配置'}
        onEdit={text => props.onChange({ keyDraft: text })}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" style={{ ...btn, border: 'none', opacity: 0.6 }} disabled={props.disabled}
          onClick={props.onRemove}>删除</button>
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
  /** 凭据名 → 是否已配置。独立于条目草稿：异步查询回来不会覆盖用户正在编辑的内容。 */
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({})
  /** 上次加载/保存时的快照，用于「有未保存修改」的检测。 */
  const [baseline, setBaseline] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  // 从 scope 快照同步到本地草稿；Key 配置状态单独异步查，不回写条目列表。
  // 返回最新的凭据状态，保存流程用它拼「缺 Key」提醒。
  const loadAll = useCallback(async (): Promise<Record<string, boolean>> => {
    const section = sectionOf(scope)
    if (section === undefined) return {}
    const img = entriesOf(section, 'imageModels', 'image')
    const vid = entriesOf(section, 'videoModels', 'video')
    setImageDrafts(img)
    setVideoDrafts(vid)
    setParams({ ...section })
    setBaseline(JSON.stringify({ img, vid, params: { ...section } }))
    const names = [...new Set([...img, ...vid].map(d => d.apiKeyEnv.trim()).filter(n => n !== ''))]
    if (names.length === 0) { setKeyStatus({}); return {} }
    const res = await ctx.remote.credentials.describe(names)
    // describe 返回的是「凭据名 → { configured }」，压平成「凭据名 → 是否已配置」
    const raw = res.ok && res.value !== undefined
      ? res.value as Record<string, { configured?: boolean }>
      : {}
    const status: Record<string, boolean> = {}
    for (const [name, info] of Object.entries(raw)) status[name] = info?.configured === true
    setKeyStatus(status)
    return status
  }, [scope, ctx])

  useEffect(() => {
    try {
      setScope(ctx.configForms.get(NS))
    } catch {
      setScope(null)
      setSaveFailed(false)
      setError(`配置命名空间「${NS}」不可用——插件没在 profile 里加载。`)
      return
    }
  }, [ctx])

  useEffect(() => {
    if (scope === null) return
    void loadAll()
  }, [scope, loadAll])

  const snapshotReady = scope !== null && sectionOf(scope) !== undefined
  const snapshotWritable = snapshotReady && scope.getSnapshot().writable !== false
  const isDirty = (): boolean => {
    if (baseline === '') return false
    return JSON.stringify({ img: imageDrafts, vid: videoDrafts, params }) !== baseline
  }

  const changeEntry = (kind: MediaKind, index: number, patch: Partial<EntryDraft>): void => {
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }
  const removeEntry = (kind: MediaKind, index: number): void => {
    const list = kind === 'image' ? imageDrafts : videoDrafts
    const removed = list[index]
    const setter = kind === 'image' ? setImageDrafts : setVideoDrafts
    setter(prev => prev.filter((_, i) => i !== index))
    // 默认模型指向被删条目时，自动改指剩下的第一个，避免生成时报 unknown model
    if (removed === undefined) return
    const defKey = kind === 'image' ? 'defaultImageModel' : 'defaultVideoModel'
    if (String(params[defKey] ?? '') === removed.id.trim()) {
      setParam(defKey, list.filter((_, i) => i !== index)[0]?.id ?? '')
    }
  }
  const addEntry = (kind: MediaKind): void => {
    const fresh: EntryDraft = {
      draftUid: newDraftUid(),
      id: '', label: '', providerKey: '', provider: kind === 'image' ? 'openai' : 'openai-videos',
      model: '', baseURL: '', apiKeyEnv: '', keyDraft: '',
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
      if (d.label.trim() === '') patch.label = preset.labelFor(kind)
      if (d.id.trim() === '') {
        const taken = new Set([...prev].map(x => x.id.trim()))
        patch.id = uniqueSuggestedId(preset.suggestedIdFor(kind), taken)
      }
      return { ...d, ...patch }
    }))
  }

  const setParam = (key: string, value: unknown): void => setParams(prev => ({ ...prev, [key]: value }))
  const param = (key: string): string => String(params[key] ?? '')

  const reload = (): void => {
    if (isDirty() && !safeConfirm('有未保存的修改，重新加载会丢弃这些修改，确定吗？')) return
    void loadAll()
  }

  // 保存：条目和参数走官方唯一写通道 scope.mutate（path 寻址、带 revision）；
  // 各条目里填了 Key 草稿的，顺手写进凭据库。任何一步失败都明确报错。
  const save = async (): Promise<void> => {
    if (scope === null || busy) return
    const seenIds = new Set<string>()
    for (const d of [...imageDrafts, ...videoDrafts]) {
      if (d.providerKey === '' && d.id.trim() === '' && d.model.trim() === '' && d.baseURL.trim() === '') {
        setError('还有没配置的空条目——选中服务商即可自动填好，不需要的条目请删除'); return
      }
      if (d.providerKey === '' && d.model.trim() === '' && d.baseURL.trim() === '') {
        setError(`条目「${d.id}」还没选服务商——选中会自动填好地址和模型名，或选「自定义」手填`); return
      }
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
    setSaveFailed(false)
    try {
      // 凭据名自动派生（空的时候）；用户在 patch 里手写过的保留不动
      const fillRef = (d: EntryDraft): EntryDraft =>
        d.apiKeyEnv.trim() === '' ? { ...d, apiKeyEnv: deriveRef(d.id) } : d
      const imageDraftsFilled = imageDrafts.map(fillRef)
      const videoDraftsFilled = videoDrafts.map(fillRef)
      setImageDrafts(imageDraftsFilled)
      setVideoDrafts(videoDraftsFilled)

      // 默认模型指向不存在的条目时（比如刚被删了），自动改指第一个，避免生成报错
      const paramsToWrite: Record<string, unknown> = { ...params }
      const imageIds = imageDraftsFilled.map(d => d.id.trim())
      const videoIds = videoDraftsFilled.map(d => d.id.trim())
      if (imageIds.length > 0 && !imageIds.includes(String(params.defaultImageModel ?? '').trim())) {
        paramsToWrite.defaultImageModel = imageIds[0]
      }
      if (videoIds.length > 0 && !videoIds.includes(String(params.defaultVideoModel ?? '').trim())) {
        paramsToWrite.defaultVideoModel = videoIds[0]
      }

      const snap = scope.getSnapshot()
      const strip = ({ draftUid: _u, keyDraft: _k, providerKey: _p, ...rest }: EntryDraft) => rest
      const ops = [
        { op: 'set', path: ['imageModels'], value: imageDraftsFilled.map(strip) },
        { op: 'set', path: ['videoModels'], value: videoDraftsFilled.map(strip) },
        ...Object.entries(paramsToWrite)
          .filter(([k]) => !MODEL_KEYS.has(k))
          .map(([k, v]) => ({ op: 'set', path: [k], value: v })),
      ]
      // 官方唯一写通道是 scope.mutate（见 SettingsFormModel.save）；
      // 返回 false 表示 revision 冲突被 host 拒绝。
      const landed = await scope.mutate(ops, snap.revision)
      if (landed !== true) {
        setSaveFailed(true)
        setError('保存被拒绝：配置已在别处修改，请点「重新加载」后重试')
        return
      }
      // Key 草稿写凭据库（只写有输入的）
      for (const d of [...imageDraftsFilled, ...videoDraftsFilled]) {
        if (d.keyDraft.trim() !== '' && d.apiKeyEnv.trim() !== '') {
          const res = await ctx.remote.credentials.set(d.apiKeyEnv.trim(), d.keyDraft.trim())
          if (!res.ok) {
            setSaveFailed(true)
            setError(`「${d.id}」的 Key 写入凭据库失败`)
            return
          }
        }
      }
      const status = await loadAll()
      // 保存后盘点缺 Key 的条目，提前提醒（用户也可能用系统环境变量，所以只提醒不阻断）
      const missing = [...imageDraftsFilled, ...videoDraftsFilled]
        .filter(d => d.keyDraft.trim() === '' && status[d.apiKeyEnv.trim()] !== true)
        .map(d => d.id)
      setMessage(missing.length > 0
        ? `已保存。提醒：${missing.join('、')} 还没配置 API Key（也没检测到已配置过），生成时会失败`
        : '已保存，配置即时生效')
    } catch (err) {
      setSaveFailed(true)
      setError(`保存出错：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const dirty = snapshotReady && isDirty()
  const disabled = !snapshotReady

  return (
    <SettingsForm
      labels={{
        unavailable: '配置不可用——插件没在本 profile 里加载',
        readOnly: '当前为只读状态，无法修改配置',
        saveFailed: '保存失败——请按下方提示修正后重试',
        save: '保存配置',
        saving: '保存中…',
      }}
      state={{
        available: snapshotReady,
        writable: snapshotWritable,
        dirty,
        invalid: false,
        saving: busy,
        failed: saveFailed,
      }}
      onSave={() => { void save() }}
      onDiscard={() => { void loadAll() }}
    >
      <div style={box}>
        {error !== '' ? <span style={tip(true)}>{error}</span> : null}
        {!snapshotReady && error === '' ? <span style={tip(true)}>配置还没加载好，稍等一下再试。</span> : null}

        <Section title="图片模型" badge={`${imageDrafts.length} 个`}
          desc="选服务商自动填好地址和模型，填上 API Key 就能用；对话和工具按 id 引用条目。">
          {imageDrafts.length === 0
            ? <span style={sectionDesc}>还没有条目——点下面「添加」，选个服务商就填好大半了。</span>
            : null}
          {imageDrafts.map((d, i) => (
            <EntryCard key={d.draftUid} entry={d} kind="image" keyStatus={keyStatus} disabled={disabled}
              onChange={patch => changeEntry('image', i, patch)}
              onProviderChange={key => applyPreset('image', i, key)}
              onRemove={() => removeEntry('image', i)} />
          ))}
          <div><button type="button" style={btn} disabled={disabled} onClick={() => addEntry('image')}>+ 添加图片模型</button></div>
        </Section>

        <Section title="视频模型" badge={`${videoDrafts.length} 个`}
          desc="同上；视频任务默认后台生成，完成后推送进会话。">
          {videoDrafts.length === 0
            ? <span style={sectionDesc}>还没有条目——点下面「添加」，选个服务商就填好大半了。</span>
            : null}
          {videoDrafts.map((d, i) => (
            <EntryCard key={d.draftUid} entry={d} kind="video" keyStatus={keyStatus} disabled={disabled}
              onChange={patch => changeEntry('video', i, patch)}
              onProviderChange={key => applyPreset('video', i, key)}
              onRemove={() => removeEntry('video', i)} />
          ))}
          <div><button type="button" style={btn} disabled={disabled} onClick={() => addEntry('video')}>+ 添加视频模型</button></div>
        </Section>

        <Section title="默认参数"
          desc="这里配置的只是默认值：生成时在对话里明确指定了参数（模型、分辨率、画幅、时长等），以对话指定的为准。">
          <ValueField id="ms-output-dir" label="输出目录"
            hint="支持 ~ 开头（展开到用户主目录），默认 ~/.dsh/media-studio；相对路径基于会话工作目录"
            text={param('outputDir')} disabled={disabled}
            onEdit={text => setParam('outputDir', text)} />
          <SelectRow id="ms-autosave" label="自动保存"
            hint="图片是否额外落盘一份（视频始终落盘，播放需要文件）"
            value={params.autoSave === false ? 'no' : 'yes'} options={['yes', 'no']}
            optionLabels={{ yes: '开启', no: '关闭' }} disabled={disabled}
            onChange={v => setParam('autoSave', v === 'yes')} />
          <span style={{ ...fieldLabel, fontWeight: 600, opacity: 0.6, marginTop: 2 }}>图片</span>
          <SelectRow id="ms-image-resolution" label="分辨率"
            hint="常用 1K–4K；要用人家的自定义档位时改 profile patch 里的 imageResolution"
            value={param('imageResolution')} options={IMAGE_RESOLUTIONS} disabled={disabled}
            onChange={v => setParam('imageResolution', v)} />
          <SelectRow id="ms-image-ratio" label="画幅" hint="宽高比，如 16:9 横、9:16 竖"
            value={param('imageAspectRatio')} options={IMAGE_RATIOS} disabled={disabled}
            onChange={v => setParam('imageAspectRatio', v)} />
          <span style={{ ...fieldLabel, fontWeight: 600, opacity: 0.6, marginTop: 2 }}>视频</span>
          <SelectRow id="ms-video-seconds" label="时长" hint="4–12 秒"
            value={param('videoSeconds')} options={VIDEO_SECONDS} disabled={disabled}
            onChange={v => {
              const n = Math.round(Number(v))
              if (Number.isFinite(n)) setParam('videoSeconds', Math.min(12, Math.max(4, n)))
            }} />
          <SelectRow id="ms-video-size" label="尺寸" hint="分辨率档位"
            value={param('videoSize')} options={VIDEO_SIZES} disabled={disabled}
            onChange={v => setParam('videoSize', v)} />
          <SelectRow id="ms-video-ratio" label="画幅" hint="宽高比"
            value={param('videoAspectRatio')} options={VIDEO_RATIOS} disabled={disabled}
            onChange={v => setParam('videoAspectRatio', v)} />
          <SelectRow id="ms-default-image-model" label="默认图片模型"
            hint="对话里没指定 model 时的兜底"
            value={param('defaultImageModel')} options={imageDrafts.map(d => d.id)} disabled={disabled}
            onChange={v => setParam('defaultImageModel', v)} />
          <SelectRow id="ms-default-video-model" label="默认视频模型"
            hint="对话里没指定 model 时的兜底"
            value={param('defaultVideoModel')} options={videoDrafts.map(d => d.id)} disabled={disabled}
            onChange={v => setParam('defaultVideoModel', v)} />
        </Section>

        <Section title="高级" desc="网络与轮询节奏（毫秒），一般不用改；保存后即时生效。">
          <ValueField id="ms-request-timeout" label="请求超时（毫秒）" numeric
            hint="单次生成 HTTP 请求的最长等待"
            text={param('requestTimeoutMs')} disabled={disabled}
            onEdit={text => {
              const n = Math.round(Number(text))
              if (Number.isFinite(n) && n >= 1000) setParam('requestTimeoutMs', n)
            }} />
          <ValueField id="ms-poll-interval" label="视频轮询间隔（毫秒）" numeric
            hint="查询视频任务进度的间隔"
            text={param('videoPollIntervalMs')} disabled={disabled}
            onEdit={text => {
              const n = Math.round(Number(text))
              if (Number.isFinite(n) && n >= 200) setParam('videoPollIntervalMs', n)
            }} />
          <ValueField id="ms-poll-timeout" label="视频轮询上限（毫秒）" numeric
            hint="超过此时长任务还没完成，按失败处理"
            text={param('videoPollTimeoutMs')} disabled={disabled}
            onEdit={text => {
              const n = Math.round(Number(text))
              if (Number.isFinite(n) && n >= 1000) setParam('videoPollTimeoutMs', n)
            }} />
        </Section>

        {message !== '' ? <span style={tip(false)}>{message}</span> : null}
      </div>
    </SettingsForm>
  )
}

/** host 服务这个配置页时，把卡片挂上插件详情页。 */
export function registerConfigCard(ctx: any): void {
  ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
    { name: 'plugins.bundle.config', key: PACKAGE_KEY, label: () => '媒体生成' },
    (ownerProps: { view?: string }) => createElement(MediaStudioConfigCard, { ctx, view: ownerProps.view }),
  ))))
}
