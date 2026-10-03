# dsh-media-studio

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![dsh](https://img.shields.io/badge/dsh-0.2.0--rc.2-4b8bbe)](https://github.com/deepseek-ai/deepseek-harness)
[![node](https://img.shields.io/badge/node-%3E%3D22.19-339933)](https://nodejs.org)

在 dsh（DeepSeek Harness）聊天里**直接生成图片 / 视频**并发送到会话的插件。
模型侧拿到 `generate_image` / `generate_video` / `send_media` 三个工具，人侧拿到
内联画廊、可播放的视频卡片，支持下载与用系统默认应用打开；生成完成后媒体
直接内联在对话中展示（AI 回合的工具结果 / 命令卡片）。

生成后端可插拔：内置 **Agnes**（免费额度，图生图 / 首尾帧 / 参考图视频）与
**OpenAI 兼容**两种适配器，预设硅基流动、阿里百炼、Gemini（OpenAI 兼容端点）、
Sora 2 等条目，也可以在配置里加任意 `baseURL + model + apiKeyEnv` 的自定义条目。

## 功能

| 能力 | 说明 |
|---|---|
| 文生图 / 图生图 | `generate_image`：本地路径、https URL、data URI 均可作参考图 |
| 文生视频 | `generate_video`：支持首尾帧（keyframe）与参考图（reference）两种模式 |
| 发送本地媒体 | `send_media`：把已有图片 / 视频文件以画廊 / 文件卡片形式进入会话 |
| 斜杠命令 | `/image`、`/video`，异步生成，完成后 AI 把图片 / 视频作为消息发到会话（可附图做图生图） |
| 富渲染 | 工具行 / 命令行内联画廊与视频播放器，支持下载、灯箱查看、系统默认应用打开 |
| 自动保存 | 生成结果写进输出目录（默认 `~/.dsh/media-studio`，`~` 展开到用户主目录；相对路径基于会话工作目录） |
| 凭据安全 | API key 走 `credential-ref`（环境变量名），永不写进配置文件 |
| 设置卡片 | 插件详情页内的官方样式配置卡片：模型条目、默认参数、高级参数 |

## 安装

要求 dsh `0.2.0-rc.2`、Node `>=22.19.0`。

打开 dsh 的 **插件** 页，点右上角 **「+ 添加插件」**，输入 GitHub 地址：

```
https://github.com/1497105876/dsh-media-studio
```

安装完成并启用即可。设置卡片在插件详情页里，API Key 直接在卡片里填。

## 凭据

每个模型条目通过 `apiKeyEnv` 引用一个**环境变量名**，插件运行时先走
`ctx.credentials` 解析，取不到再回退普通环境变量。例如用 Agnes 免费生图：

```bash
export AGNES_API_KEY=sk-...
```

## 模型配置

默认只内置 **Agnes**（有免费额度，填一个 `AGNES_API_KEY` 就能用，支持文生图 /
图生图 / 文生视频）。

其他服务商在设置卡片里「+ 添加」后**选服务商即可**——OpenAI 生图 / Sora 2、
Gemini、硅基流动、阿里云百炼等常见服务商已内置，选中自动填好接口地址和
参考模型名，再填一个 API Key 就能用；下拉里没有的服务商选「自定义」手填
`provider`（适配器）+ `model`（模型名）+ `baseURL`（接口地址）三件套。
常见服务商参考：

| 服务商 | provider | baseURL | model 示例 | Key 引用名 |
|---|---|---|---|---|
| OpenAI 生图 | `openai` | `https://api.openai.com/v1` | `gpt-image-1` | `OPENAI_API_KEY` |
| OpenAI Sora 2 | `openai-videos` | `https://api.openai.com/v1` | `sora-2` | `OPENAI_API_KEY` |
| Gemini 生图 | `openai` | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-flash-image` | `GEMINI_API_KEY` |
| 硅基流动 | `openai` | `https://api.siliconflow.cn/v1` | `Kwai-Kolors/Kolors` | `SILICONFLOW_API_KEY` |
| 阿里云百炼 | `openai` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `wanx2.1-t2i-turbo` | `DASHSCOPE_API_KEY` |

provider 三选一：`agnes`（Agnes 专有 quirks）、`openai`（OpenAI 兼容图片接口）、
`openai-videos`（OpenAI Videos 风格异步接口）。任何 OpenAI 兼容的中转 /
自建服务都能接。

## 工具

- **`generate_image`** — `prompt` 必填；可选 `model`、`resolution`（1K–4K）、
  `aspect_ratio`、`reference_images`（图生图）、`run_in_background`（默认 true）。
- **`generate_video`** — `prompt` 必填；可选 `model`、`seconds`（4–12）、`size`
  （720P–2K）、`aspect_ratio`、`mode`（text / keyframe / reference）、
  `first_frame` / `last_frame`、`reference_images`、`run_in_background`（默认 true）。
- **`send_media`** — `paths`（本地文件路径的字符串数组）+ 可选 `caption`。

三个工具都声明了规范 JSON 输出 schema，并在工具结果里直接渲染媒体块，
同时投影 `presentationMeta` 供浏览器半渲染富视图。

## 斜杠命令

```
/image <提示词>            # 异步生成，完成后 AI 把图片作为消息发到会话（可附图做图生图）
/video <提示词>            # 异步生成（通常几分钟），完成后 AI 把视频作为消息发到会话
```

## 配置

**设置卡片（推荐）**：插件详情页里的配置卡片，分四区：

- **图片模型 / 视频模型**：选服务商自动填好地址和模型，填上 API Key 就能用；
  Key 走官方 `remote.credentials` 通道存进 dsh 凭据库（只写不读），保存即时生效。
- **默认参数**：默认模型、输出目录、分辨率 / 画幅 / 时长（常见档位下拉点选）。
  这些只是默认值，对话里明确指定了参数时以对话指定的为准。
- **高级**：请求超时与视频轮询节奏（秒），默认折叠，一般不用动。

凭据也可以用系统环境变量代替（`setx AGNES_API_KEY sk-...` 后重启 dsh），
两种方式插件都会识别。

也可以用 profile patch 整值覆盖（patch 语义是整值替换，不做深合并）：

| 键 | 默认 | 说明 |
|---|---|---|
| `imageModels` / `videoModels` | 预设清单 | 模型条目目录 |
| `defaultImageModel` / `defaultVideoModel` | `agnes-image` / `agnes-video` | 工具省略 `model` 时的兜底 |
| `outputDir` | `~/.dsh/media-studio` | 自动保存目录（`~` 展开到用户主目录；相对路径基于会话工作目录） |
| `autoSave` | `true` | 是否自动落盘一份 |
| `imageResolution` / `imageAspectRatio` | `2K` / `16:9` | 图片默认参数（允许服务商支持的其他档位） |
| `videoSeconds` / `videoSize` / `videoAspectRatio` | `5` / `720P` / `16:9` | 视频默认参数（允许服务商支持的其他档位） |
| `requestTimeoutSec` | `300` | 生成请求超时（秒） |
| `videoPollIntervalSec` / `videoPollTimeoutSec` | `30` / `300` | 视频任务轮询（秒） |

## 架构

```
src/
  index.ts            host 半入口：export const name / inject / Config / apply
  tools.ts            三个媒体工具（schema / render / presentationMeta / execute）
  commands.ts         /image /video 斜杠命令（异步生成，完成后经 notice+followup 唤醒 AI 发图）
  providers.ts        agnes / openai / openai-videos 三种适配器
  media.ts            落盘、附件提交、参考图读取、媒体类型嗅探
  config.ts           schemastery 配置（volatile，卡片即时生效）
  client/             浏览器半（React）
    tool-row.tsx        工具行：内联画廊 / 视频播放器
    gallery.tsx         消息图片画廊（替换 stock gallery）
    media.tsx           画廊 / 灯箱 / 播放器 / 下载 / 系统打开
    native-open.ts      宿主原生打开通道（系统默认应用）
    settings-card.tsx   设置卡片（官方 SettingsForm 风格，走 remote.credentials）
scripts/
  build-client.mjs  esbuild 打包浏览器半为 lazy-CJS client bundle
```

host 半是 tsc 直出的 ESM（`lib/index.js`）；浏览器半打包成官方
`window.__ModuleLoader__.load({ id, factory })` 形状（`lib/client.js`），
`react` 走平台注入的模块表，不自带 react 副本。

## License

[MIT](./LICENSE)
