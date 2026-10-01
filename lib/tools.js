import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { deliverMediaMessage, lookupAgent, startMediaJob } from './jobs.js';
import { commitImage, commitVideo, describeLocalFile, readReferenceImage, resolveOutputDir, sniffImageMediaType, imageMediaTypeForPath, } from './media.js';
import { generateImage, generateVideo } from './providers.js';
const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9'];
const RESOLUTIONS = ['1K', '2K', '3K', '4K'];
const VIDEO_SIZES = ['720P', '1080P', '1K', '2K'];
const VIDEO_MODES = ['text', 'keyframe', 'reference'];
/** Shared item node for canonical values and presentation metadata. */
const MEDIA_ITEM_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        kind: { type: 'string', enum: ['image', 'video', 'file'], required: true },
        name: { type: 'string', required: true },
        path: { type: 'string' },
        bytes: { type: 'integer', required: true },
        mediaType: { type: 'string' },
        width: { type: 'integer' },
        height: { type: 'integer' },
        attachmentId: { type: 'string' },
    },
};
const IMAGE_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        kind: { type: 'string', enum: ['image-generation'], required: true },
        status: { type: 'string', enum: ['started', 'completed'], required: true },
        jobId: { type: 'string' },
        prompt: { type: 'string', required: true },
        model: { type: 'string', required: true },
        provider: { type: 'string', enum: ['agnes', 'openai', 'openai-videos'], required: true },
        images: { type: 'array', items: MEDIA_ITEM_SCHEMA, required: true },
    },
};
const VIDEO_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        kind: { type: 'string', enum: ['video-generation'], required: true },
        status: { type: 'string', enum: ['started', 'completed'], required: true },
        jobId: { type: 'string' },
        prompt: { type: 'string', required: true },
        model: { type: 'string', required: true },
        provider: { type: 'string', enum: ['agnes', 'openai', 'openai-videos'], required: true },
        videos: { type: 'array', items: MEDIA_ITEM_SCHEMA, required: true },
    },
};
const SEND_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        kind: { type: 'string', enum: ['media-send'], required: true },
        caption: { type: 'string' },
        files: { type: 'array', items: MEDIA_ITEM_SCHEMA, required: true },
    },
};
/** Resolve a model entry by id (falling back to the configured default). */
export function resolveModel(entries, defaultId, requested, kind) {
    const id = (requested === undefined || requested.trim() === '') ? defaultId : requested.trim();
    const found = entries.find(entry => entry.id === id);
    if (found !== undefined)
        return found;
    const known = entries.map(entry => entry.id).join(', ') || '(none)';
    throw new Error(`unknown ${kind} model "${id}"; configured entries: ${known}`);
}
/** Resolve the API key through the credential seam, then plain environment. */
export async function resolveApiKey(ctx, entry) {
    const envName = entry.apiKeyEnv.trim();
    if (envName === '')
        throw new Error(`model "${entry.id}" has no apiKeyEnv configured`);
    try {
        const resolved = await ctx.credentials.resolve(credentialRef(envName));
        if (resolved?.value !== undefined && resolved.value !== '')
            return resolved.value;
    }
    catch {
        // Fall through to the plain environment below.
    }
    const fromEnv = process.env[envName];
    if (fromEnv !== undefined && fromEnv !== '')
        return fromEnv;
    throw new Error(`missing API key: set the ${envName} environment variable (model "${entry.id}")`);
}
function sessionCwd(agent) {
    return agent?.session.header.cwd;
}
function imageBlockFor(item) {
    if (item.attachmentId === undefined || item.mediaType === undefined)
        return undefined;
    return {
        type: 'image',
        attachment: {
            attachmentId: item.attachmentId,
            mediaType: item.mediaType,
            bytes: item.bytes,
            width: item.width ?? 0,
            height: item.height ?? 0,
            name: item.name,
        },
    };
}
function itemLine(item) {
    return item.path === undefined ? `- ${item.name}` : `- \`${item.path}\``;
}
function formatImageSummary(images) {
    return `✅ 图片生成完成（${images.length} 张）：\n${images.map(itemLine).join('\n')}`;
}
function formatVideoSummary(videos) {
    return `✅ 视频生成完成：\n${videos.map(itemLine).join('\n')}`;
}
/** Build the chat push content for finished images. */
export function buildImagePushContent(headline, images) {
    const blocks = [{ type: 'text', text: `${headline}\n${images.map(itemLine).join('\n')}` }];
    for (const item of images) {
        const block = imageBlockFor(item);
        if (block !== undefined)
            blocks.push(block);
    }
    return blocks;
}
/** Build the chat push content for a finished video. */
export function buildVideoPushContent(headline, videos) {
    const lines = videos.map(item => {
        const sizeMb = (item.bytes / (1024 * 1024)).toFixed(1);
        return item.path === undefined
            ? `- ${item.name}（${sizeMb} MB）`
            : `- \`${item.path}\`（${sizeMb} MB）`;
    });
    return [{
            type: 'text',
            text: `${headline}\n${lines.join('\n')}\n点击文件路径可在系统播放器打开；文件已保存到输出目录，可在文件管理器中另存。`,
        }];
}
async function runImageGeneration(gc, entry, apiKey, params) {
    const generated = await generateImage(entry, apiKey, {
        prompt: params.prompt,
        resolution: params.resolution,
        aspectRatio: params.aspectRatio,
        referenceImages: params.referenceImages,
        signal: params.signal,
        timeoutMs: gc.config.requestTimeoutSec.get() * 1000,
    });
    const name = `image-${entry.id}-${Date.now()}.${generated.mediaType === 'image/jpeg' ? 'jpg' : generated.mediaType === 'image/webp' ? 'webp' : 'png'}`;
    const item = await commitImage(gc.ctx.attachments, {
        name,
        bytes: generated.bytes,
        mediaType: generated.mediaType,
        outputDir: gc.outputDir,
        autoSave: gc.autoSave,
    });
    return [item];
}
async function runVideoGeneration(gc, entry, apiKey, params) {
    const generated = await generateVideo(entry, apiKey, {
        prompt: params.prompt,
        seconds: params.seconds,
        size: params.size,
        aspectRatio: params.aspectRatio,
        mode: params.mode,
        ...(params.firstFrame === undefined ? {} : { firstFrame: params.firstFrame }),
        ...(params.lastFrame === undefined ? {} : { lastFrame: params.lastFrame }),
        referenceImages: params.referenceImages,
        signal: params.signal,
        timeoutMs: gc.config.requestTimeoutSec.get() * 1000,
        pollIntervalMs: gc.config.videoPollIntervalSec.get() * 1000,
        pollTimeoutMs: gc.config.videoPollTimeoutSec.get() * 1000,
        ...(params.onProgress === undefined ? {} : { onProgress: params.onProgress }),
    });
    const item = await commitVideo({
        name: `video-${entry.id}-${Date.now()}.mp4`,
        bytes: generated.bytes,
        outputDir: gc.outputDir,
        autoSave: true,
    });
    return [item];
}
function generationContext(ctx, config, cwd) {
    return {
        ctx,
        config,
        outputDir: resolveOutputDir(config.outputDir.get(), cwd),
        autoSave: config.autoSave.get(),
    };
}
/** Register the three media tools. */
export function registerMediaTools(ctx, config) {
    ctx.tools.register(defineTool({
        name: 'generate_image',
        description: '生成图片并在对话中展示。支持文生图与图生图（reference_images 传本地路径或 https URL）。'
            + '默认后台生成（run_in_background: true）：立即返回任务句柄，完成后图片推送到会话；'
            + '设为 false 则同步等待并在工具结果里直接返回图片。',
        parameters: {
            prompt: { type: 'string', required: true, description: '图片描述 / 编辑指令（中文英文均可）' },
            model: { type: 'string', description: '生图模型条目 id（见插件配置 imageModels）；省略用默认模型' },
            resolution: { type: 'string', enum: RESOLUTIONS, description: '分辨率档位，默认取配置 imageResolution' },
            aspect_ratio: { type: 'string', enum: ASPECT_RATIOS, description: '画幅比例，默认取配置 imageAspectRatio' },
            reference_images: {
                type: 'array',
                items: { type: 'string' },
                description: '图生图参考图：本地文件路径、https URL 或 data URI（可多张）',
            },
            run_in_background: { type: 'boolean', description: '默认 true：后台生成完成后推送进会话；false：同步等待并在结果里返回图片' },
        },
        output: {
            schema: IMAGE_VALUE_SCHEMA,
            render: (_args, value) => {
                const data = value;
                const blocks = [];
                if (data.status === 'started') {
                    blocks.push({
                        type: 'text',
                        text: `⏳ 图片后台生成已开始${data.jobId === undefined ? '' : `（任务 ${data.jobId}）`}，完成后会把图片推送到会话。`,
                    });
                }
                else {
                    blocks.push({ type: 'text', text: formatImageSummary(data.images) });
                    for (const item of data.images) {
                        const block = imageBlockFor(item);
                        if (block !== undefined)
                            blocks.push(block);
                    }
                }
                return blocks;
            },
            presentationMeta: (_args, value) => {
                const data = value;
                return JSON.parse(JSON.stringify({ items: data.images }));
            },
        },
        presentCall: args => ({
            card: 'generic',
            title: `生成图片：${String(args.prompt ?? '').slice(0, 60)}`,
        }),
        async execute(args, exec) {
            const entry = resolveModel(config.imageModels.get(), config.defaultImageModel.get(), args.model, 'image');
            const apiKey = await resolveApiKey(ctx, entry);
            const referenceImages = await Promise.all((args.reference_images ?? []).map(readReferenceImage));
            const gc = generationContext(ctx, config, sessionCwd(exec.agent));
            const params = {
                prompt: args.prompt,
                resolution: args.resolution ?? config.imageResolution.get(),
                aspectRatio: args.aspect_ratio ?? config.imageAspectRatio.get(),
                referenceImages,
            };
            const base = {
                kind: 'image-generation',
                prompt: params.prompt,
                model: entry.id,
                provider: entry.provider,
            };
            if (args.run_in_background === false) {
                const images = await runImageGeneration(gc, entry, apiKey, { ...params, signal: exec.signal });
                return { ...base, status: 'completed', images };
            }
            const owner = exec.agent?.id;
            const jobId = startMediaJob(ctx, {
                kind: 'media-image',
                label: params.prompt,
                owner,
                work: async (job, signal) => {
                    job.updateProgress(`generating image with ${entry.id}…`);
                    const images = await runImageGeneration(gc, entry, apiKey, { ...params, signal });
                    const summary = formatImageSummary(images);
                    const agent = lookupAgent(ctx, owner);
                    if (agent !== undefined) {
                        deliverMediaMessage(agent, buildImagePushContent(`🖼️ 图片生成完成（${entry.label || entry.id}）`, images));
                    }
                    return { summary };
                },
            });
            return {
                ...base,
                status: 'started',
                ...(jobId === undefined ? {} : { jobId }),
                images: [],
            };
        },
    }));
    ctx.tools.register(defineTool({
        name: 'generate_video',
        description: '生成视频并推送到对话。支持文生视频、首尾帧（keyframe 模式 + first_frame/last_frame）与参考图（reference 模式）。'
            + '默认后台生成（run_in_background: true）：立即返回任务句柄，视频生成通常需要几分钟，完成后推送到会话；'
            + '设为 false 则同步等待并在工具结果里返回视频文件。',
        parameters: {
            prompt: { type: 'string', required: true, description: '视频描述（reference 模式可用 <Picture 1> 指代参考图）' },
            model: { type: 'string', description: '视频模型条目 id（见插件配置 videoModels）；省略用默认模型' },
            seconds: { type: 'integer', description: '时长（秒）4–12，默认取配置 videoSeconds' },
            size: { type: 'string', enum: VIDEO_SIZES, description: '分辨率档位，默认取配置 videoSize' },
            aspect_ratio: { type: 'string', enum: ASPECT_RATIOS, description: '画幅比例，默认取配置 videoAspectRatio' },
            mode: { type: 'string', enum: VIDEO_MODES, description: 'text=文生视频；keyframe=首尾帧；reference=参考图' },
            first_frame: { type: 'string', description: 'keyframe 模式：首帧图片路径或 https URL' },
            last_frame: { type: 'string', description: 'keyframe 模式：尾帧图片路径或 https URL' },
            reference_images: { type: 'array', items: { type: 'string' }, description: 'reference 模式：参考图路径或 https URL' },
            run_in_background: { type: 'boolean', description: '默认 true：后台生成完成后推送进会话；false：同步等待' },
        },
        output: {
            schema: VIDEO_VALUE_SCHEMA,
            render: (_args, value) => {
                const data = value;
                const blocks = [];
                if (data.status === 'started') {
                    blocks.push({
                        type: 'text',
                        text: `⏳ 视频后台生成已开始${data.jobId === undefined ? '' : `（任务 ${data.jobId}）`}，通常需要几分钟，完成后会推送到会话。`,
                    });
                }
                else {
                    blocks.push({ type: 'text', text: formatVideoSummary(data.videos) });
                }
                return blocks;
            },
            presentationMeta: (_args, value) => {
                const data = value;
                return JSON.parse(JSON.stringify({ items: data.videos }));
            },
        },
        presentCall: args => ({
            card: 'generic',
            title: `生成视频：${String(args.prompt ?? '').slice(0, 60)}`,
        }),
        async execute(args, exec) {
            const entry = resolveModel(config.videoModels.get(), config.defaultVideoModel.get(), args.model, 'video');
            const apiKey = await resolveApiKey(ctx, entry);
            const referenceImages = await Promise.all((args.reference_images ?? []).map(readReferenceImage));
            const mode = args.mode ?? 'text';
            const firstFrame = args.first_frame === undefined ? undefined : await readReferenceImage(args.first_frame);
            const lastFrame = args.last_frame === undefined ? undefined : await readReferenceImage(args.last_frame);
            const gc = generationContext(ctx, config, sessionCwd(exec.agent));
            const params = {
                prompt: args.prompt,
                seconds: args.seconds ?? config.videoSeconds.get(),
                size: args.size ?? config.videoSize.get(),
                aspectRatio: args.aspect_ratio ?? config.videoAspectRatio.get(),
                mode,
                ...(firstFrame === undefined ? {} : { firstFrame }),
                ...(lastFrame === undefined ? {} : { lastFrame }),
                referenceImages,
            };
            const base = {
                kind: 'video-generation',
                prompt: params.prompt,
                model: entry.id,
                provider: entry.provider,
            };
            if (args.run_in_background === false) {
                const videos = await runVideoGeneration(gc, entry, apiKey, { ...params, signal: exec.signal });
                return { ...base, status: 'completed', videos };
            }
            const owner = exec.agent?.id;
            const jobId = startMediaJob(ctx, {
                kind: 'media-video',
                label: params.prompt,
                owner,
                work: async (job, signal) => {
                    job.updateProgress(`generating video with ${entry.id}…`);
                    const videos = await runVideoGeneration(gc, entry, apiKey, {
                        ...params,
                        signal,
                        onProgress: line => job.updateProgress(line),
                    });
                    const summary = formatVideoSummary(videos);
                    const agent = lookupAgent(ctx, owner);
                    if (agent !== undefined) {
                        deliverMediaMessage(agent, buildVideoPushContent(`🎬 视频生成完成（${entry.label || entry.id}）`, videos));
                    }
                    return { summary };
                },
            });
            return {
                ...base,
                status: 'started',
                ...(jobId === undefined ? {} : { jobId }),
                videos: [],
            };
        },
    }));
    ctx.tools.register(defineTool({
        name: 'send_media',
        description: '把本地已有的图片或视频文件发送到对话中展示（图片内联画廊、视频可播放/下载）。'
            + '只接受本地文件路径；图片会作为持久附件进入会话，视频/其他文件按文件卡片+路径展示。',
        parameters: {
            paths: { type: 'array', items: { type: 'string' }, required: true, description: '要发送的本地文件路径列表' },
            caption: { type: 'string', description: '随图说明文字' },
        },
        output: {
            schema: SEND_VALUE_SCHEMA,
            render: (_args, value) => {
                const data = value;
                const head = data.caption === undefined || data.caption === '' ? '📎 已发送文件：' : `📎 ${data.caption}`;
                const blocks = [{ type: 'text', text: `${head}\n${data.files.map(itemLine).join('\n')}` }];
                for (const item of data.files) {
                    const block = imageBlockFor(item);
                    if (block !== undefined)
                        blocks.push(block);
                }
                return blocks;
            },
            presentationMeta: (_args, value) => {
                const data = value;
                return JSON.parse(JSON.stringify({ items: data.files }));
            },
        },
        presentCall: args => ({
            card: 'generic',
            title: `发送文件：${(args.paths ?? []).length} 个`,
        }),
        async execute(args) {
            const paths = args.paths;
            if (paths.length === 0)
                throw new Error('paths must not be empty');
            const files = [];
            for (const rawPath of paths) {
                const described = await describeLocalFile(rawPath);
                if (described.kind === 'image') {
                    const { readFile } = await import('node:fs/promises');
                    const bytes = new Uint8Array(await readFile(described.path));
                    const mediaType = imageMediaTypeForPath(described.path) ?? sniffImageMediaType(bytes) ?? 'image/png';
                    const ref = await ctx.attachments.saveImage({ data: bytes, mediaType, name: described.name });
                    files.push({
                        ...described,
                        bytes: ref.bytes,
                        mediaType: ref.mediaType,
                        width: ref.width,
                        height: ref.height,
                        attachmentId: ref.attachmentId,
                    });
                }
                else {
                    files.push(described);
                }
            }
            return { kind: 'media-send', ...(args.caption === undefined ? {} : { caption: args.caption }), files };
        },
    }));
}
/** Payload projection shared with the slash commands. */
export function mediaPayload(kind, text, items) {
    return { v: 1, kind, text, items: [...items] };
}
