/**
 * Background generation and chat delivery.
 *
 * Long media generations run through `ctx.jobs` (the official background-job
 * seam): the tool returns a typed `jobId` handle immediately, the job does the
 * work under its own cancellation signal, and the finished media is pushed to
 * the owning session as a completion notice — `followup` wakes an idle agent,
 * `inject` queues it while a turn runs (the delivery policy of
 * `dsh-tool-jobs`).
 */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { JobHooks, JobId, JobOutcome } from '@deepseek-ai/dsh-jobs'

declare module '@deepseek-ai/dsh-jobs' {
  interface JobKindMap {
    'media-image': 'media-image'
    'media-video': 'media-video'
  }
}

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /** Completion notices produced by this plugin's background jobs. */
    'media-studio': { kind: 'media-studio'; form: 'notice'; summary: string }
  }
}

/** Minimal structural view of the agent registry service. */
interface AgentRegistryLike {
  get(id: string): Agent | undefined
}

/** Look up the live agent owning a session id. */
export function lookupAgent(ctx: Context, sessionId: Agent['id'] | undefined): Agent | undefined {
  if (sessionId === undefined) return undefined
  const registry = (ctx as unknown as { get(name: string): unknown }).get('agents') as AgentRegistryLike | undefined
  return registry?.get(sessionId)
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
export function deliverMediaMessage(agent: Agent, content: ContentBlock[], summary: string): void {
  const message = createUserMessage({
    content,
    source: { kind: 'media-studio', form: 'notice', summary: boundContextSummary(summary) },
  })
  try {
    if (agent.status === 'idle') agent.followup(message)
    else agent.inject(message)
  } catch {
    try {
      agent.inject(message)
    } catch {
      // The agent may already be disposed; nothing else to deliver to.
    }
  }
}

export interface MediaJobWork {
  append(text: string): void
  updateProgress(line: string): void
}

export interface MediaJobRequest {
  kind: 'media-image' | 'media-video'
  /** One-line model-visible label (usually the prompt). */
  label: string
  /** Owning session id; messages are pushed to this session on completion. */
  owner: Agent['id'] | undefined
  /**
   * The generation work. The work itself commits media and pushes the chat
   * message, so the detached fallback delivers identically.
   */
  work: (job: MediaJobWork, signal: AbortSignal) => Promise<{ summary: string }>
}

/**
 * Start a background generation job and return its id. When the composition
 * carries no job controller (or the registry refuses), the work runs detached
 * and still pushes its result on completion.
 */
export function startMediaJob(ctx: Context, request: MediaJobRequest): string | undefined {
  const runWork = (job: MediaJobWork, controller: AbortController): Promise<JobOutcome> =>
    (async (): Promise<JobOutcome> => {
      try {
        const { summary } = await request.work(job, controller.signal)
        return { status: 'completed', detail: 'media generated', result: summary }
      } catch (error) {
        return {
          status: controller.signal.aborted ? 'killed' : 'failed',
          detail: error instanceof Error ? error.message : String(error),
        }
      }
    })()
  try {
    const jobId: JobId = ctx.jobs.start({
      kind: request.kind,
      label: request.label.slice(0, 120),
      owner: request.owner,
      run: (job): JobHooks => {
        const controller = new AbortController()
        const done = runWork({
          append: text => job.append(text),
          updateProgress: line => job.updateProgress(line),
        }, controller)
        return {
          cancel: () => controller.abort(),
          done,
        }
      },
    })
    return jobId as unknown as string
  } catch {
    // No attached job controller (or the registry refused): run detached.
    const controller = new AbortController()
    void runWork({ append: () => undefined, updateProgress: () => undefined }, controller)
    return undefined
  }
}
