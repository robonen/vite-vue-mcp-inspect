import {
  devtools,
  devtoolsState,
  stringify as _stringify,
  toggleHighPerfMode,
} from '@vue/devtools-kit'
import { PLUGIN_NAME } from '../constants'

export { _stringify as stringify }

export const COMPONENTS_INSPECTOR_ID = 'components'
export const PINIA_INSPECTOR_ID = 'pinia'

export const DEVTOOLS_TIMEOUT = 5000

/** Race a promise against a timeout. Rejects if the promise doesn't settle in time. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`[${PLUGIN_NAME}] ${label} timed out after ${ms}ms`)),
      ms,
    )
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
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
  if (!tree) return { error: `Component "${name}" not found.\nAvailable: none` }
  const stack: any[] = [tree]
  const names: string[] = []
  while (stack.length > 0) {
    const n = stack.pop()!
    if (n.name === name) return { node: n }
    names.push(n.name)
    if (Array.isArray(n.children)) {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i])
    }
  }
  const available = [...new Set(names)].slice(0, 20).join(', ')
  return { error: `Component "${name}" not found.\nAvailable: ${available}` }
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

/** Fetch the component inspector tree root. */
export async function fetchComponentTree(): Promise<any> {
  const tree = await withTimeout(
    devtools.api.getInspectorTree({
      inspectorId: COMPONENTS_INSPECTOR_ID,
      filter: '',
    }),
    DEVTOOLS_TIMEOUT,
    'getInspectorTree',
  )
  return tree[0]
}

/** Fetch the component tree, find a node by name, and call the callback with it. */
export async function withComponentNode<S, E>(
  name: string,
  onSuccess: (node: any) => Promise<S> | S,
  onError: (error: string) => E,
): Promise<S | E> {
  const root = await fetchComponentTree()
  const { node, error } = findNode(root, name)
  if (error) return onError(error)
  return onSuccess(node)
}

/** Temporarily disable high-perf mode for the duration of fn, then restore. */
export async function withHighPerfDisabled<T>(fn: () => Promise<T>): Promise<T> {
  const wasHighPerf = devtoolsState.highPerfModeEnabled
  if (wasHighPerf) toggleHighPerfMode(false)
  try {
    return await fn()
  }
  finally {
    if (wasHighPerf) toggleHighPerfMode(true)
  }
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
