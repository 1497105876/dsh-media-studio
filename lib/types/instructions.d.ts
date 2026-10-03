/**
 * One-time per-session instruction injection.
 *
 * The chat renders local-path markdown images inline in the assistant message
 * (pathImages → /api/file) — that is the one channel where generated media
 * shows up as part of the AI's reply instead of a collapsed tool group. The
 * model just has to copy the markdown image lines from the tool result into
 * its reply; this queued instruction (never rendered, durable context) makes
 * that a standing rule instead of a per-call suggestion.
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        /** Producer messages from this plugin: never rendered, model-facing only. */
        'media-studio': {
            kind: 'media-studio';
        } & ({
            form: 'instructions';
        } | {
            form: 'notice';
            summary: string;
        });
    }
}
export declare const MEDIA_DISPLAY_INSTRUCTIONS: string;
/** Queue the display instructions once per agent (no wake; claimed at the next pre-step). */
export declare function ensureMediaInstructions(ctx: {
    get(name: string): unknown;
}, agentId: string | undefined): void;
/**
 * Deliver a background-completion notice and wake the agent. The notice
 * itself renders nothing; the woken reply carries the markdown media lines
 * (per MEDIA_DISPLAY_INSTRUCTIONS), so the picture shows up inside the AI's
 * message — never as a user-bubble impersonation, never folded away.
 */
export declare function deliverMediaCompletion(agent: Agent, text: string, summary: string): void;
