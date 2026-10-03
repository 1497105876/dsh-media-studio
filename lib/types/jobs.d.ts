/**
 * Background generation and chat delivery.
 *
 * Long media generations run through `ctx.jobs` (the official background-job
 * seam): the tool returns a typed `jobId` handle immediately, the job does the
 * work under its own cancellation signal, and the finished media is pushed to
 * the owning conversation as an ordinary chat message — the user-bubble form
 * renders the image blocks directly in the conversation flow (no collapsed
 * process group to expand). Delivery: `followup` wakes an idle agent for a
 * short confirmation turn; `inject` queues the message while a turn runs.
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
 * Deliver finished media into the owning conversation as an ordinary chat
 * message: the user-message form renders image blocks directly in the
 * conversation flow on every client (no process-group folding). Image blocks
 * render as an inline gallery; text carries the auto-saved paths.
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
