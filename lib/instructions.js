import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm';
export const MEDIA_DISPLAY_INSTRUCTIONS = [
    '【媒体展示规范（硬性要求）】',
    '当 generate_image / send_media 等工具结果末尾出现「向用户展示：请在你的回复中原样输出以下 Markdown 图片行」时，',
    '你必须在给用户的回复中原样输出那些 Markdown 图片行（形如 ![生成结果](C:/path/x.png)）——',
    '一行都不要改动、不要用代码块包裹、不要省略任何一行，这样图片才会直接显示在你的消息里。',
    '除输出这些图片行外，回复保持简短自然。不要读取、抽帧或以任何方式「检查」已生成的文件。',
].join('');
const sent = new Set();
/** Queue the display instructions once per agent (no wake; claimed at the next pre-step). */
export function ensureMediaInstructions(ctx, agentId) {
    if (agentId === undefined || sent.has(agentId))
        return;
    sent.add(agentId);
    const registry = ctx.get('agents');
    const agent = registry?.get(agentId);
    if (agent === undefined)
        return;
    const message = createUserMessage({
        content: [{ type: 'text', text: MEDIA_DISPLAY_INSTRUCTIONS }],
        source: { kind: 'media-studio', form: 'instructions' },
    });
    try {
        agent.inject(message);
    }
    catch {
        // Agent disposed between lookup and inject; the per-call guidance still applies.
    }
}
/**
 * Deliver a background-completion notice and wake the agent. The notice
 * itself renders nothing; the woken reply carries the markdown media lines
 * (per MEDIA_DISPLAY_INSTRUCTIONS), so the picture shows up inside the AI's
 * message — never as a user-bubble impersonation, never folded away.
 */
export function deliverMediaCompletion(agent, text, summary) {
    const message = createUserMessage({
        content: [{ type: 'text', text }],
        source: { kind: 'media-studio', form: 'notice', summary: boundContextSummary(summary) },
    });
    try {
        agent.followup(message);
    }
    catch {
        try {
            agent.inject(message);
        }
        catch {
            // Agent disposed; nothing else to deliver to.
        }
    }
}
