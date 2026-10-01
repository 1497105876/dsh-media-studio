import { deliverMediaMessage, startMediaJob } from './jobs.js';
import { resolveOutputDir, toDataUri } from './media.js';
import { resolveApiKey, resolveModel, buildImagePushContent, buildVideoPushContent, mediaPayload } from './tools.js';
import { encodeCommandPayload } from './types.js';
import { commitImage, commitVideo } from './media.js';
import { generateImage, generateVideo } from './providers.js';
const WAIT_FLAG = '--wait';
/** File extension for a generated image media type. */
function imageExtension(mediaType) {
    return mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png';
}
function stripWaitFlag(rawInput) {
    const trimmed = rawInput.trim();
    if (trimmed === WAIT_FLAG)
        return { prompt: '', wait: true };
    if (trimmed.startsWith(`${WAIT_FLAG} `))
        return { prompt: trimmed.slice(WAIT_FLAG.length + 1).trim(), wait: true };
    return { prompt: trimmed, wait: false };
}
function itemLine(item) {
    return item.path === undefined ? `- ${item.name}` : `- \`${item.path}\``;
}
/** Turn the command's submitted attachments into reference-image inputs. */
async function referencesFromAttachments(ctx, invocation) {
    const refs = [];
    for (const block of invocation.attachments) {
        if (block.type !== 'image')
            continue;
        const stored = await ctx.attachments.readImage(block.attachment, invocation.signal);
        refs.push({ dataUri: toDataUri(stored.data, stored.ref.mediaType) });
    }
    return refs;
}
/** Register `/image` and `/video`. */
export function registerMediaCommands(ctx, config) {
    ctx.effect(() => ctx.commands.register({
        name: 'image',
        description: '生成图片：/image <提示词>（可附图做图生图）。加 --wait 前缀同步等待并在命令卡片内联展示。',
        input: { hint: '提示词', attachments: true },
        handler: async (invocation) => {
            const { prompt, wait } = stripWaitFlag(invocation.rawInput);
            if (prompt === '')
                return { kind: 'error', text: '用法：/image [--wait] <提示词>（可附参考图做图生图）' };
            try {
                const entry = resolveModel(config.imageModels.get(), config.defaultImageModel.get(), undefined, 'image');
                const apiKey = await resolveApiKey(ctx, entry);
                const referenceImages = await referencesFromAttachments(ctx, invocation);
                const cwd = invocation.agent.session.header.cwd;
                const outputDir = resolveOutputDir(config.outputDir.get(), cwd);
                const params = {
                    prompt,
                    resolution: config.imageResolution.get(),
                    aspectRatio: config.imageAspectRatio.get(),
                    referenceImages,
                };
                if (wait) {
                    const generated = await generateImage(entry, apiKey, {
                        ...params,
                        signal: invocation.signal,
                        timeoutMs: config.requestTimeoutMs,
                    });
                    const name = `image-${entry.id}-${Date.now()}.${imageExtension(generated.mediaType)}`;
                    const item = await commitImage(ctx.attachments, {
                        name,
                        bytes: generated.bytes,
                        mediaType: generated.mediaType,
                        outputDir,
                        autoSave: config.autoSave.get(),
                    });
                    const text = `✅ 图片生成完成（${entry.label || entry.id}）：\n${itemLine(item)}`;
                    return {
                        kind: 'success',
                        text: `${text}\n${encodeCommandPayload(mediaPayload('image', text, [item]))}`,
                    };
                }
                const agent = invocation.agent;
                startMediaJob(ctx, {
                    kind: 'media-image',
                    label: prompt,
                    owner: agent.id,
                    work: async (job, signal) => {
                        job.updateProgress(`generating image with ${entry.id}…`);
                        const generated = await generateImage(entry, apiKey, { ...params, signal, timeoutMs: config.requestTimeoutMs });
                        const name = `image-${entry.id}-${Date.now()}.${imageExtension(generated.mediaType)}`;
                        const item = await commitImage(ctx.attachments, {
                            name,
                            bytes: generated.bytes,
                            mediaType: generated.mediaType,
                            outputDir,
                            autoSave: config.autoSave.get(),
                        });
                        deliverMediaMessage(agent, buildImagePushContent(`🖼️ 图片生成完成（${entry.label || entry.id}）`, [item]));
                        return { summary: `image generated: ${item.path ?? item.name}` };
                    },
                });
                return { kind: 'success', text: `⏳ 图片生成已开始（${entry.label || entry.id}），完成后会推送到会话。` };
            }
            catch (error) {
                return { kind: 'error', text: error instanceof Error ? error.message : String(error) };
            }
        },
    }));
    ctx.effect(() => ctx.commands.register({
        name: 'video',
        description: '生成视频：/video <提示词>。默认后台生成完成后推送进会话；加 --wait 前缀同步等待并在命令卡片内联播放。',
        input: { hint: '提示词', attachments: false },
        handler: async (invocation) => {
            const { prompt, wait } = stripWaitFlag(invocation.rawInput);
            if (prompt === '')
                return { kind: 'error', text: '用法：/video [--wait] <提示词>' };
            try {
                const entry = resolveModel(config.videoModels.get(), config.defaultVideoModel.get(), undefined, 'video');
                const apiKey = await resolveApiKey(ctx, entry);
                const cwd = invocation.agent.session.header.cwd;
                const outputDir = resolveOutputDir(config.outputDir.get(), cwd);
                const params = {
                    prompt,
                    seconds: config.videoSeconds.get(),
                    size: config.videoSize.get(),
                    aspectRatio: config.videoAspectRatio.get(),
                    mode: 'text',
                    referenceImages: [],
                };
                const runGeneration = async (signal, onProgress) => {
                    const generated = await generateVideo(entry, apiKey, {
                        ...params,
                        signal,
                        timeoutMs: config.requestTimeoutMs,
                        pollIntervalMs: config.videoPollIntervalMs,
                        pollTimeoutMs: config.videoPollTimeoutMs,
                        ...(onProgress === undefined ? {} : { onProgress }),
                    });
                    return [await commitVideo({
                            name: `video-${entry.id}-${Date.now()}.mp4`,
                            bytes: generated.bytes,
                            outputDir,
                            autoSave: true,
                        })];
                };
                if (wait) {
                    const videos = await runGeneration(invocation.signal);
                    const text = `✅ 视频生成完成（${entry.label || entry.id}）：\n${videos.map(itemLine).join('\n')}`;
                    return {
                        kind: 'success',
                        text: `${text}\n${encodeCommandPayload(mediaPayload('video', text, videos))}`,
                    };
                }
                const agent = invocation.agent;
                startMediaJob(ctx, {
                    kind: 'media-video',
                    label: prompt,
                    owner: agent.id,
                    work: async (job, signal) => {
                        job.updateProgress(`generating video with ${entry.id}…`);
                        const videos = await runGeneration(signal, line => job.updateProgress(line));
                        deliverMediaMessage(agent, buildVideoPushContent(`🎬 视频生成完成（${entry.label || entry.id}）`, videos));
                        return { summary: `video generated: ${videos[0]?.path ?? ''}` };
                    },
                });
                return { kind: 'success', text: `⏳ 视频生成已开始（${entry.label || entry.id}），通常需要几分钟，完成后会推送到会话。` };
            }
            catch (error) {
                return { kind: 'error', text: error instanceof Error ? error.message : String(error) };
            }
        },
    }));
}
