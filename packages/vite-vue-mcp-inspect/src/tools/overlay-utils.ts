import {
  devtools,
  stringify as _stringify,
} from '@vue/devtools-kit'

export { _stringify as stringify }

export const COMPONENTS_INSPECTOR_ID = 'components'
export const PINIA_INSPECTOR_ID = 'pinia'

export const DEVTOOLS_TIMEOUT = 5000

/** Race a promise against a timeout. Rejects if the promise doesn't settle in time. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[vue-mcp] ${label} timed out after ${ms}ms`)), ms),
    ),
  ])
}

export function flattenChildren(node: any): any[] {
  if (!node) return []
  const result: any[] = []
  const stack: any[] = [node]
  while (stack.length > 0) {
    const n = stack.pop()
    result.push(n)
    const children = n.children
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i])
      }
    }
  }
  return result
}

export function findNode(tree: any, name: string): { node: any; error?: never } | { node?: never; error: string } {
  const all = flattenChildren(tree)
  const node = all.find((n: any) => n.name === name)
  if (!node) {
    const available = [...new Set(all.map((n: any) => n.name))].slice(0, 20).join(', ')
    return { error: `Component "${name}" not found.\nAvailable: ${available}` }
  }
  return { node }
}

let highlightTimer: ReturnType<typeof setTimeout> | null = null

/** Highlight a component node for 5 seconds, clearing any previous highlight timer. */
export function setHighlight(nodeId: string): void {
  if (highlightTimer) clearTimeout(highlightTimer)
  ;(devtools as any).ctx.hooks.callHook('componentHighlight', { uid: nodeId })
  highlightTimer = setTimeout(() => {
    ;(devtools as any).ctx.hooks.callHook('componentUnhighlight')
  }, 5000)
}

/** Fetch the component tree, find a node by name, and call the callback with it. */
export async function withComponentNode<S, E>(
  name: string,
  onSuccess: (node: any) => Promise<S> | S,
  onError: (error: string) => E,
): Promise<S | E> {
  const tree = await withTimeout(
    devtools.api.getInspectorTree({
      inspectorId: COMPONENTS_INSPECTOR_ID,
      filter: '',
    }),
    DEVTOOLS_TIMEOUT,
    'getInspectorTree',
  )
  const { node, error } = findNode(tree[0], name)
  if (error) return onError(error)
  return onSuccess(node)
}

/** Run async tasks in batches of `concurrency` to avoid freezing the browser. */
export async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    results.push(...await Promise.all(batch.map(fn)))
  }
  return results
}
