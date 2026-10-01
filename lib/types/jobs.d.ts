/**
 * Background generation and chat delivery.
 *
 * Long media generations run through `ctx.jobs` (the official background-job
 * seam): the tool returns a typed `jobId` handle immediately, the job does the
 * work under its own cancellation signal, and the finished media is pushed to
 * the owning session as a chat message — `followup` (wakes a idle agent) when
 * idle, `steer` while a turn is running, mirroring the completion-notice
 * policy of `dsh-tool-jobs`.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
declare module '@deepseek-ai/dsh-jobs' {
    interface JobKindMap {
        'media-image': 'media-image';
        'media-video': 'media-video';
    }
}
/** Look up the live agent owning a session id. */
export declare function lookupAgent(ctx: Context, sessionId: Agent['id'] | undefined): Agent | undefined;
/**
 * Deliver finished media into the owning conversation. Image blocks render as
 * an inline gallery in the message bubble; text carries the auto-saved paths
 * (also opened by the path chips / the `send_media` row).
 */
export declare function deliverMediaMessage(agent: Agent, content: ContentBlock[]): void;
export interface MediaJobWork {
    append(text: string): void;
    updateProgress(line: string): void;
}
export interface MediaJobRequest {
    kind: 'media-image' | 'media-video';
    /** One-line model-visible label (usually the prompt). */
    label: string;
    /** Owning session id; messages are pushed to this session on completion. */
    owner: Agent['id'] | undefined;
    /**
     * The generation work. The work itself commits media and pushes the chat
     * message, so the detached fallback delivers identically.
     */
    work: (job: MediaJobWork, signal: AbortSignal) => Promise<{
        summary: string;
    }>;
}
/**
 * Start a background generation job and return its id. When the composition
 * carries no job controller (or the registry refuses), the work runs detached
 * and still pushes its result on completion.
 */
export declare function startMediaJob(ctx: Context, request: MediaJobRequest): string | undefined;
