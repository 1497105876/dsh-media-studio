import { resolveOutputDir, toDataUri } from './media.js';
import { resolveApiKey, resolveModel, mediaPayload } from './tools.js';
import { encodeCommandPayload } from './types.js';
import { commitImage, commitVideo } from './media.js';
import { generateImage, generateVideo } from './providers.js';
/** File extension for a generated image media type. */
function imageExtension(mediaType) {
    return mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png';
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
        description: '生成图片：/image <提示词>（可附图做图生图）。同步生成，图片内联展示在本条命令卡片里。',
        input: { hint: '提示词', attachments: true },
        handler: async (invocation) => {
            const prompt = invocation.rawInput.trim();
            if (prompt === '')
                return { kind: 'error', text: '用法：/image <提示词>（可附参考图做图生图）' };
            try {
                const entry = resolveModel(config.imageModels.get(), config.defaultImageModel.get(), undefined, 'image');
                const apiKey = await resolveApiKey(ctx, entry);
                const referenceImages = await referencesFromAttachments(ctx, invocation);
                const cwd = invocation.agent.session.header.cwd;
                const outputDir = resolveOutputDir(config.outputDir.get(), cwd);
                const generated = await generateImage(entry, apiKey, {
                    prompt,
                    resolution: config.imageResolution.get(),
                    aspectRatio: config.imageAspectRatio.get(),
                    referenceImages,
                    signal: invocation.signal,
                    timeoutMs: config.requestTimeoutSec.get() * 1000,
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
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                const text = /abort/i.test(message) ? '已取消：生成被中断（重新提交命令会打断正在进行的生成，请等它完成）' : message;
                return { kind: 'error', text };
            }
        },
    }));
    ctx.effect(() => ctx.commands.register({
        name: 'video',
        description: '生成视频：/video <提示词>。同步等待生成完成（通常几分钟），视频内联在本条命令卡片里播放。',
        input: { hint: '提示词', attachments: false },
        handler: async (invocation) => {
            const prompt = invocation.rawInput.trim();
            if (prompt === '')
                return { kind: 'error', text: '用法：/video <提示词>' };
            try {
                const entry = resolveModel(config.videoModels.get(), config.defaultVideoModel.get(), undefined, 'video');
                const apiKey = await resolveApiKey(ctx, entry);
                const cwd = invocation.agent.session.header.cwd;
                const outputDir = resolveOutputDir(config.outputDir.get(), cwd);
                const generated = await generateVideo(entry, apiKey, {
                    prompt,
                    seconds: config.videoSeconds.get(),
                    size: config.videoSize.get(),
                    aspectRatio: config.videoAspectRatio.get(),
                    mode: 'text',
                    referenceImages: [],
                    signal: invocation.signal,
                    timeoutMs: config.requestTimeoutSec.get() * 1000,
                    pollIntervalMs: config.videoPollIntervalSec.get() * 1000,
                    pollTimeoutMs: config.videoPollTimeoutSec.get() * 1000,
                });
                const videos = [await commitVideo({
                        name: `video-${entry.id}-${Date.now()}.mp4`,
                        bytes: generated.bytes,
                        outputDir,
                        autoSave: true,
                    })];
                const text = `✅ 视频生成完成（${entry.label || entry.id}）：\n${videos.map(itemLine).join('\n')}`;
                return {
                    kind: 'success',
                    text: `${text}\n${encodeCommandPayload(mediaPayload('video', text, videos))}`,
                };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                const text = /abort/i.test(message) ? '已取消：生成被中断（重新提交命令会打断正在进行的生成，请等它完成）' : message;
                return { kind: 'error', text };
            }
        },
    }));
}
