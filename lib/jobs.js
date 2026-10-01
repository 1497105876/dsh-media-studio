import { createUserMessage } from '@deepseek-ai/dsh-llm';
/** Look up the live agent owning a session id. */
export function lookupAgent(ctx, sessionId) {
    if (sessionId === undefined)
        return undefined;
    const registry = ctx.get('agents');
    return registry?.get(sessionId);
}
/**
 * Deliver finished media into the owning conversation. Image blocks render as
 * an inline gallery in the message bubble; text carries the auto-saved paths
 * (also opened by the path chips / the `send_media` row).
 */
export function deliverMediaMessage(agent, content) {
    const message = createUserMessage({ content, source: { kind: 'user' } });
    try {
        if (agent.status === 'idle')
            agent.followup(message);
        else
            agent.steer(message);
    }
    catch {
        try {
            agent.inject(message);
        }
        catch {
            // The agent may already be disposed; nothing else to deliver to.
        }
    }
}
/**
 * Start a background generation job and return its id. When the composition
 * carries no job controller (or the registry refuses), the work runs detached
 * and still pushes its result on completion.
 */
export function startMediaJob(ctx, request) {
    const runWork = (job, controller) => (async () => {
        try {
            const { summary } = await request.work(job, controller.signal);
            return { status: 'completed', detail: 'media generated', result: summary };
        }
        catch (error) {
            return {
                status: controller.signal.aborted ? 'killed' : 'failed',
                detail: error instanceof Error ? error.message : String(error),
            };
        }
    })();
    try {
        const jobId = ctx.jobs.start({
            kind: request.kind,
            label: request.label.slice(0, 120),
            owner: request.owner,
            run: (job) => {
                const controller = new AbortController();
                const done = runWork({
                    append: text => job.append(text),
                    updateProgress: line => job.updateProgress(line),
                }, controller);
                return {
                    cancel: () => controller.abort(),
                    done,
                };
            },
        });
        return jobId;
    }
    catch {
        // No attached job controller (or the registry refused): run detached.
        const controller = new AbortController();
        void runWork({ append: () => undefined, updateProgress: () => undefined }, controller);
        return undefined;
    }
}
