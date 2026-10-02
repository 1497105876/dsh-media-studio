/**
 * Host native-open channel. The session controller exposes
 * `openWorkspacePath` (open with the OS-associated application, i.e. the
 * double-click behavior) and `canOpenWorkspacePath` (availability probe).
 * Bound once from the client plugin's apply(); every media card checks
 * availability before showing the "open" action, and hides it when the host
 * can't open native paths (e.g. non-desktop session root).
 */

interface SessionOpenRemote {
  canOpenWorkspacePath?: () => Promise<{ ok: boolean; value?: boolean }>
  openWorkspacePath?: (request: { path: string; action?: 'reveal' }) => Promise<{ ok: boolean }>
}

let session: SessionOpenRemote | undefined
let availability: Promise<boolean> | undefined

/** Bind the `remote.session` seam from the client plugin's apply(). */
export function bindNativeOpen(sessionRemote: unknown): void {
  const candidate = sessionRemote as SessionOpenRemote | undefined
  session = candidate !== undefined && typeof candidate.openWorkspacePath === 'function' ? candidate : undefined
}

/** Probe (once) whether the host can open native paths. */
export function probeNativeOpen(): Promise<boolean> {
  availability ??= (async () => {
    if (session === undefined || session.canOpenWorkspacePath === undefined) return false
    try {
      const result = await session.canOpenWorkspacePath()
      return result.ok === true && result.value === true
    } catch {
      return false
    }
  })()
  return availability
}

/** Open a host-side path with the OS-associated application (double-click behavior). */
export async function nativeOpenPath(path: string): Promise<boolean> {
  if (session === undefined || session.openWorkspacePath === undefined) return false
  try {
    const result = await session.openWorkspacePath({ path })
    return result.ok === true
  } catch {
    return false
  }
}
