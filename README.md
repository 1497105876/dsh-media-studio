# dsh-media-studio

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![dsh](https://img.shields.io/badge/dsh-0.2.0--rc.2-4b8bbe)](https://github.com/deepseek-ai/deepseek-harness)
[![node](https://img.shields.io/badge/node-%3E%3D22.19-339933)](https://nodejs.org)

在 dsh（DeepSeek Harness）聊天里**直接生成图片 / 视频**并发送到会话的插件。
模型侧拿到 `generate_image` / `generate_video` / `send_media` 三个工具，人侧拿到
内联画廊、可播放的视频卡片和下载 / 另存为按钮；长耗时生成默认走后台任务，
完成后自动把结果推送回会话。

生成后端可插拔：内置 **Agnes**（免费额度，图生图 / 首尾帧 / 参考图视频）与
**OpenAI 兼容**两种适配器，预设硅基流动、阿里百炼、Gemini（OpenAI 兼容端点）、
Sora 2 等条目，也可以在配置里加任意 `baseURL + model + apiKeyEnv` 的自定义条目。

## 功能

| 能力 | 说明 |
|---|---|
| 文生图 / 图生图 | `generate_image`：本地路径、https URL、data URI 均可作参考图 |
| 文生视频 | `generate_video`：支持首尾帧（keyframe）与参考图（reference）两种模式 |
| 发送本地媒体 | `send_media`：把已有图片 / 视频文件以画廊 / 文件卡片形式进入会话 |
| 斜杠命令 | `/image`、`/video`，加 `--wait` 前缀同步等待并在命令卡片内联展示 |
| 后台生成 | 默认走 `ctx.jobs` 后台任务，立即返回任务句柄，完成后推送进会话 |
| 富渲染 | 工具行 / 命令行内联画廊与视频播放器，带下载、另存为 |
| 自动保存 | 生成结果写进输出目录（默认 `media-output`，相对会话工作目录解析） |
| 凭据安全 | API key 走 `credential-ref`（环境变量名），永不写进配置文件 |
| 设置页 | 所有配置项 `volatile`，出现在 dsh 设置页的插件表单里 |

## 安装

要求 dsh `>=0.2.0-rc.2 <0.3.0`、Node `>=22.19.0`。

从源码构建并装进 profile：

```bash
git clone https://github.com/1497105876/dsh-media-studio
cd dsh-media-studio
npm install          # prepare 钩子会自动跑 npm run build

# web profile（桌面客户端换成 profiles/desktop）
cp -r . ~/.dsh/profiles/web/node_modules/dsh-media-studio/
```

然后在 `~/.dsh/profiles/web/cordis.patch.yml` 追加（装进 node_modules 后按包名引用）：

```yaml
- insert:
    - id: media-studio
      name: dsh-media-studio
```

重启 dsh 即可。包内自带的 `cordis.patch.yml` 也可以整份抄进 profile patch，
用来覆盖默认配置（patch 语义是整值替换，不做深合并）。

## 凭据

每个模型条目通过 `apiKeyEnv` 引用一个**环境变量名**，插件运行时先走
`ctx.credentials` 解析，取不到再回退普通环境变量。例如用 Agnes 免费生图：

```bash
export AGNES_API_KEY=sk-...
```

## 预设模型

图片：

| id | 说明 | 凭据 |
|---|---|---|
| `agnes-image` | Agnes agnes-image-2.5-flash（当前免费，支持图生图/多图） | `AGNES_API_KEY` |
| `gpt-image` | OpenAI gpt-image-1 | `OPENAI_API_KEY` |
| `nano-banana` | Gemini 2.5 flash image（OpenAI 兼容端点） | `GEMINI_API_KEY` |
| `kolors` | 硅基流动 Kolors（国内直连） | `SILICONFLOW_API_KEY` |
| `flux-schnell` | 硅基流动 FLUX.1-schnell | `SILICONFLOW_API_KEY` |
| `wanx` | 阿里云百炼 wanx2.1-t2i-turbo | `DASHSCOPE_API_KEY` |

视频：

| id | 说明 | 凭据 |
|---|---|---|
| `agnes-video` | Agnes agnes-video-2.5-flash（当前免费，720P） | `AGNES_API_KEY` |
| `agnes-video-25` | Agnes agnes-video-2.5（720P–2K） | `AGNES_API_KEY` |
| `sora-2` | OpenAI Sora 2（Videos 风格异步接口） | `OPENAI_API_KEY` |

自定义条目只需 `id + provider + model + baseURL + apiKeyEnv` 五个字段。

## 工具

- **`generate_image`** — `prompt` 必填；可选 `model`、`resolution`（1K–4K）、
  `aspect_ratio`、`reference_images`（图生图）、`run_in_background`（默认 true）。
- **`generate_video`** — `prompt` 必填；可选 `model`、`seconds`（4–12）、`size`
  （720P–2K）、`aspect_ratio`、`mode`（text / keyframe / reference）、
  `first_frame` / `last_frame`、`reference_images`、`run_in_background`（默认 true）。
- **`send_media`** — `paths`（本地文件列表）+ 可选 `caption`。

三个工具都声明了规范 JSON 输出 schema，并在工具结果里直接渲染媒体块，
同时投影 `presentationMeta` 供浏览器半渲染富视图。

## 斜杠命令

```
/image <提示词>            # 后台生成，完成后推送
/image --wait <提示词>      # 同步等待，命令卡片内联展示（可附图做图生图）
/video <提示词>            # 后台生成（通常几分钟），完成后推送
/video --wait <提示词>      # 同步等待，卡片内联播放
```

## 配置

全部出现在 dsh 设置页（Settings → 插件 → media-studio），也可用 profile
patch 整值覆盖：

| 键 | 默认 | 说明 |
|---|---|---|
| `imageModels` / `videoModels` | 预设清单 | 模型条目目录 |
| `defaultImageModel` / `defaultVideoModel` | `agnes-image` / `agnes-video` | 工具省略 `model` 时的兜底 |
| `outputDir` | `media-output` | 自动保存目录（相对会话工作目录） |
| `autoSave` | `true` | 是否自动落盘一份 |
| `imageResolution` / `imageAspectRatio` | `2K` / `16:9` | 图片默认参数 |
| `videoSeconds` / `videoSize` / `videoAspectRatio` | `5` / `720P` / `16:9` | 视频默认参数 |
| `requestTimeoutMs` | `300000` | 生成请求超时 |
| `videoPollIntervalMs` / `videoPollTimeoutMs` | `2000` / `900000` | 视频任务轮询 |

## 架构

```
src/
  index.ts        host 半入口：export const name / inject / Config / apply
  tools.ts        三个媒体工具（schema / render / presentationMeta / execute）
  commands.ts     /image /video 斜杠命令
  jobs.ts         ctx.jobs 后台任务 + 完成推送（followup / steer / inject 兜底）
  providers.ts    agnes / openai / openai-videos 三种适配器
  media.ts        落盘、附件提交、参考图读取、媒体类型嗅探
  config.ts       schemastery 配置（volatile，进设置页）
  client/         浏览器半：工具行、命令行、消息画廊（React，内联样式）
scripts/
  build-client.mjs  esbuild 打包浏览器半为 lazy-CJS client bundle
```

host 半是 tsc 直出的 ESM（`lib/index.js`）；浏览器半打包成官方
`window.__ModuleLoader__.load({ id, factory })` 形状（`lib/client.js`），
`react` 走平台注入的模块表，不自带 react 副本。

## 开发

```bash
npm install
npm run typecheck   # host + client 双 tsconfig
npm run build       # tsc 出 host 半 + esbuild 出 client 半
```

## License

[MIT](./LICENSE)
