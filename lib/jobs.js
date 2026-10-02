import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm';
/** Look up the live agent owning a session id. */
export function lookupAgent(ctx, sessionId) {
    if (sessionId === undefined)
        return undefined;
    const registry = ctx.get('agents');
    return registry?.get(sessionId);
}
/**
 * Deliver finished media into the owning conversation as a completion notice.
 *
 * The message source declares this plugin's own producer kind with
 * `form: 'notice'` — exactly like `dsh-tool-jobs` completion notices — so the
 * UI renders it as a task notice (not a user bubble) and the model reads it as
 * a job outcome instead of something the user said. Image blocks render as an
 * inline gallery; text carries the auto-saved paths.
 */
export function deliverMediaMessage(agent, content, summary) {
    const message = createUserMessage({
        content,
        source: { kind: 'media-studio', form: 'notice', summary: boundContextSummary(summary) },
    });
    try {
        if (agent.status === 'idle')
            agent.followup(message);
        else
            agent.inject(message);
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
