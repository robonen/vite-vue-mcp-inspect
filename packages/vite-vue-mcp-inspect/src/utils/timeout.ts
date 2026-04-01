import type { Hookable } from 'hookable'

/**
 * Wraps a one-shot hookable event in a timeout.
 *
 * 1. Registers a `hookOnce` listener for `eventName`.
 * 2. Calls `trigger()` to fire the RPC call that will eventually resolve the hook.
 * 3. Races the hook against a timeout.
 * 4. If the timeout fires first the promise rejects with a user-friendly error.
 *    The dangling hook listener cleans itself up when it eventually fires
 *    (hookOnce auto-removes after first invocation) — the `settled` flag
 *    ensures the resolution is ignored.
 */
export function withBrowserTimeout<T>(
  hooks: Hookable<Record<string, any>>,
  eventName: string,
  trigger: () => void,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error(
          `Tool "${toolName}" timed out after ${timeoutMs}ms.\n`
          + `Make sure the Vue app is open in a browser tab and @vue/devtools is loaded.`,
        ))
      }
    }, timeoutMs)

    hooks.hookOnce(eventName, (data: T) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(data)
      }
    })

    try {
      trigger()
    }
    catch (err) {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    }
  })
}
