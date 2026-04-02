import {
  activeAppRecord,
  devtools,
  devtoolsRouterInfo,
  devtoolsState,
  getInspector,
  stringify,
  toggleHighPerfMode,
} from '@vue/devtools-kit'
import { createRPCClient } from 'vite-dev-rpc'
import { createHotContext } from 'vite-hot-client'

const base = (import.meta as any).env?.BASE_URL ?? '/'
const hot = createHotContext('', base)

const COMPONENTS_INSPECTOR_ID = 'components'
const PINIA_INSPECTOR_ID = 'pinia'

devtools.init()

// ── Helpers ──────────────────────────────────────────────────────────────

function flattenChildren(node: any): any[] {
  const result: any[] = []
  function traverse(n: any): void {
    if (!n) return
    result.push(n)
    if (Array.isArray(n.children)) n.children.forEach(traverse)
  }
  traverse(node)
  return result
}

function findNode(tree: any, name: string): { node: any; error?: never } | { node?: never; error: string } {
  const all = flattenChildren(tree)
  const node = all.find((n: any) => n.name === name)
  if (!node) {
    const available = [...new Set(all.map((n: any) => n.name))].slice(0, 20).join(', ')
    return { error: `Component "${name}" not found.\nAvailable: ${available}` }
  }
  return { node }
}

let highlightTimer: ReturnType<typeof setTimeout> | null = null

/** Fetch the component tree, find a node by name, and call the callback with it. */
async function withComponentNode<S, E>(
  name: string,
  onSuccess: (node: any) => Promise<S> | S,
  onError: (error: string) => E,
): Promise<S | E> {
  const tree = await devtools.api.getInspectorTree({
    inspectorId: COMPONENTS_INSPECTOR_ID,
    filter: '',
  })
  const { node, error } = findNode(tree[0], name)
  if (error) return onError(error)
  return onSuccess(node)
}

/** Highlight a component node for 5 seconds, clearing any previous highlight timer. */
function setHighlight(nodeId: string): void {
  if (highlightTimer) clearTimeout(highlightTimer)
  ;(devtools as any).ctx.hooks.callHook('componentHighlight', { uid: nodeId })
  highlightTimer = setTimeout(() => {
    ;(devtools as any).ctx.hooks.callHook('componentUnhighlight')
  }, 5000)
}

/** Run async tasks in batches of `concurrency` to avoid freezing the browser. */
async function mapConcurrent<T, R>(
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

// ── RPC client ───────────────────────────────────────────────────────────

const rpc = createRPCClient<any, any>(
  'vite-vue-mcp-inspect',
  hot,
  {
    // ── Component tree ──────────────────────────────────────────────────
    async getInspectorTree(query: { event: string }) {
      try {
        const tree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        rpc.onInspectorTreeUpdated(query.event, tree[0])
      }
      catch (err) {
        rpc.onInspectorTreeUpdated(query.event, { error: String(err) })
      }
    },

    async getDetailedComponentTree(query: { event: string }) {
      try {
        const tree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        const all = flattenChildren(tree[0])
        const detailed = await mapConcurrent(all, 10, async (node: any) => {
          try {
            const state = await devtools.api.getInspectorState({
              inspectorId: COMPONENTS_INSPECTOR_ID,
              nodeId: node.id,
            })
            return { name: node.name, id: node.id, file: node.file, state: stringify(state) }
          }
          catch {
            return { name: node.name, id: node.id, file: node.file }
          }
        })
        rpc.onDetailedComponentTreeUpdated(query.event, detailed)
      }
      catch (err) {
        rpc.onDetailedComponentTreeUpdated(query.event, { error: String(err) })
      }
    },

    // ── Component state ─────────────────────────────────────────────────
    async getInspectorState(query: { event: string; componentName: string }) {
      try {
        const result = await withComponentNode(
          query.componentName,
          async (node) => {
            const state = await devtools.api.getInspectorState({
              inspectorId: COMPONENTS_INSPECTOR_ID,
              nodeId: node.id,
            })
            return stringify(state)
          },
          (error) => ({ error }),
        )
        rpc.onInspectorStateUpdated(query.event, result)
      }
      catch (err) {
        rpc.onInspectorStateUpdated(query.event, { error: String(err) })
      }
    },

    // ── Edit component state ────────────────────────────────────────────
    async editComponentState(query: {
      componentName: string
      path: string[]
      value: string
      valueType: string
      event: string
    }) {
      try {
        const result = await withComponentNode(
          query.componentName,
          async (node) => {
            await (devtools as any).ctx.api.editInspectorState({
              inspectorId: COMPONENTS_INSPECTOR_ID,
              nodeId: node.id,
              path: query.path,
              state: {
                new: null,
                remove: false,
                type: query.valueType,
                value: query.value,
              },
              type: undefined,
            })
            return { success: true as const }
          },
          (error) => ({ success: false as const, error }),
        )
        rpc.onEditComponentStateDone(query.event, result)
      }
      catch (err) {
        rpc.onEditComponentStateDone(query.event, { success: false, error: String(err) })
      }
    },

    // ── Highlight component ─────────────────────────────────────────────
    async highlightComponent(query: { componentName: string; event: string }) {
      try {
        const result = await withComponentNode(
          query.componentName,
          (node) => {
            setHighlight(node.id)
            return { success: true as const }
          },
          (error) => ({ success: false as const, error }),
        )
        rpc.onHighlightComponentDone(query.event, result)
      }
      catch (err) {
        rpc.onHighlightComponentDone(query.event, { success: false, error: String(err) })
      }
    },

    // ── Scroll to component ─────────────────────────────────────────────
    async scrollToComponent(query: { componentName: string; event: string }) {
      try {
        const result = await withComponentNode(
          query.componentName,
          async (node) => {
            setHighlight(node.id)
            // Wait for the overlay to paint
            await new Promise(r => setTimeout(r, 50))
            // Scroll to the highlight overlay if it exists in the DOM
            const overlay = document.querySelector<HTMLElement>('.__vue-devtools-component-inspector__')
              ?? document.querySelector<HTMLElement>('[data-vue-devtools-component-inspector]')
            if (overlay) {
              overlay.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            return { success: true as const }
          },
          (error) => ({ success: false as const, error }),
        )
        rpc.onScrollToComponentDone(query.event, result)
      }
      catch (err) {
        rpc.onScrollToComponentDone(query.event, { success: false, error: String(err) })
      }
    },

    // ── Router info ─────────────────────────────────────────────────────
    async getRouterInfo(query: { event: string }) {
      try {
        rpc.onRouterInfoUpdated(query.event, JSON.parse(JSON.stringify(devtoolsRouterInfo)))
      }
      catch (err) {
        rpc.onRouterInfoUpdated(query.event, { error: String(err) })
      }
    },

    // ── Navigate to route ────────────────────────────────────────────────
    async navigateToRoute(query: { path: string; event: string }) {
      try {
        // Access the Vue Router instance via the app's globalProperties
        const router = activeAppRecord.value?.app?.config?.globalProperties?.$router
        if (!router) {
          rpc.onNavigateToRouteDone(query.event, {
            success: false,
            error: 'Vue Router not detected. Make sure vue-router is installed and configured.',
          })
          return
        }
        await router.push(query.path)
        rpc.onNavigateToRouteDone(query.event, { success: true })
      }
      catch (err) {
        rpc.onNavigateToRouteDone(query.event, { success: false, error: String(err) })
      }
    },

    // ── Pinia tree ──────────────────────────────────────────────────────
    async getPiniaTree(query: { event: string }) {
      const wasHighPerf = devtoolsState.highPerfModeEnabled
      if (wasHighPerf) toggleHighPerfMode(false)
      try {
        const tree = await devtools.api.getInspectorTree({
          inspectorId: PINIA_INSPECTOR_ID,
          filter: '',
        })
        rpc.onPiniaTreeUpdated(query.event, tree)
      }
      catch (err) {
        rpc.onPiniaTreeUpdated(query.event, { error: String(err) })
      }
      finally {
        if (wasHighPerf) toggleHighPerfMode(true)
      }
    },

    // ── Pinia state ─────────────────────────────────────────────────────
    async getPiniaState(query: { event: string; storeName: string }) {
      const wasHighPerf = devtoolsState.highPerfModeEnabled
      if (wasHighPerf) toggleHighPerfMode(false)
      try {
        const inspector = getInspector(PINIA_INSPECTOR_ID)
        const prevNodeId = inspector?.selectedNodeId
        try {
          if (inspector) inspector.selectedNodeId = query.storeName
          const state = await (devtools as any).ctx.api.getInspectorState({
            inspectorId: PINIA_INSPECTOR_ID,
            nodeId: query.storeName,
          })
          rpc.onPiniaInfoUpdated(query.event, stringify(state))
        }
        finally {
          if (inspector && prevNodeId !== undefined) inspector.selectedNodeId = prevNodeId
        }
      }
      catch (err) {
        rpc.onPiniaInfoUpdated(query.event, { error: String(err) })
      }
      finally {
        if (wasHighPerf) toggleHighPerfMode(true)
      }
    },

    // ── Edit Pinia state ────────────────────────────────────────────────
    async editPiniaState(query: {
      storeName: string
      path: string[]
      value: string
      valueType: string
      event: string
    }) {
      const wasHighPerf = devtoolsState.highPerfModeEnabled
      if (wasHighPerf) toggleHighPerfMode(false)
      try {
        const inspector = getInspector(PINIA_INSPECTOR_ID)
        if (!inspector) {
          rpc.onPiniaStateEditDone(query.event, { success: false, error: 'Pinia inspector not found' })
          return
        }
        const prevNodeId = inspector.selectedNodeId
        try {
          inspector.selectedNodeId = query.storeName
          await (devtools as any).ctx.api.editInspectorState({
            inspectorId: PINIA_INSPECTOR_ID,
            nodeId: query.storeName,
            path: query.path,
            state: {
              new: null,
              remove: false,
              type: query.valueType,
              value: query.value,
            },
            type: undefined,
          })
          rpc.onPiniaStateEditDone(query.event, { success: true })
        }
        finally {
          if (prevNodeId !== undefined) inspector.selectedNodeId = prevNodeId
        }
      }
      catch (err) {
        rpc.onPiniaStateEditDone(query.event, { success: false, error: String(err) })
      }
      finally {
        if (wasHighPerf) toggleHighPerfMode(true)
      }
    },

    // ── App info ────────────────────────────────────────────────────────
    async getAppInfo(query: { event: string }) {
      try {
        const appRecord = activeAppRecord.value
        const vueApp = appRecord?.app
        const info = {
          vueVersion: vueApp?.version ?? 'unknown',
          plugins: Object.keys(vueApp?.config?.globalProperties ?? {}).filter((k: string) => !k.startsWith('__')),
          devtoolsState: {
            connected: devtoolsState.connected,
            vitePluginDetected: devtoolsState.vitePluginDetected,
            highPerfModeEnabled: devtoolsState.highPerfModeEnabled,
          },
          router: devtoolsRouterInfo
            ? {
                currentRoute: devtoolsRouterInfo.currentRoute,
                routesCount: devtoolsRouterInfo.routes?.length ?? 0,
              }
            : null,
        }
        rpc.onAppInfoUpdated(query.event, info)
      }
      catch (err) {
        rpc.onAppInfoUpdated(query.event, { error: String(err) })
      }
    },

    // ── Reload app ──────────────────────────────────────────────────────
    async reloadApp(query: { event: string }) {
      // Fire the ack BEFORE reloading so the server receives it
      rpc.onReloadAppDone(query.event)
      await new Promise(r => setTimeout(r, 50))
      location.reload()
    },

    // ── Get component by file ───────────────────────────────────────────
    async getComponentByFile(query: { filePath: string; event: string }) {
      try {
        const tree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        const all = flattenChildren(tree[0])
        const match = all.find((n: any) => n.file?.endsWith(query.filePath))
        if (!match) {
          rpc.onComponentByFileUpdated(query.event, {
            found: false,
            error: `No component found with file path ending in "${query.filePath}"`,
          })
          return
        }
        const state = await devtools.api.getInspectorState({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          nodeId: match.id,
        })
        rpc.onComponentByFileUpdated(query.event, {
          found: true,
          name: match.name,
          file: match.file,
          state: stringify(state),
        })
      }
      catch (err) {
        rpc.onComponentByFileUpdated(query.event, { found: false, error: String(err) })
      }
    },

    // ── Reactivity relationships ────────────────────────────────────────
    async getReactivityRelationships(query: { event: string; componentName: string }) {
      try {
        const result = await withComponentNode(
          query.componentName,
          async (node) => {
            const instance = activeAppRecord.value?.instanceMap?.get(node.id)
            if (!instance) {
              return { graphNodes: [], relationships: [] }
            }

            const raw = (instance as any).devtoolsRawSetupState || {}
            const stateItems: ReactivityStateItem[] = []

            for (const key of Object.keys(raw)) {
              const rawData = raw[key]
              if (!rawData) continue

              const isRefLike = rawData?.__v_isRef === true
              const isReactiveLike = rawData?.__v_isReactive === true
              const isComputedLike = isRefLike && typeof rawData?.effect === 'object'

              if (!isRefLike && !isReactiveLike) continue

              const subs = processReactivitySubs(rawData)
              const deps = processReactivityDeps(rawData)

              const stateType = isComputedLike ? 'computed' : isRefLike ? 'ref' : 'reactive'

              stateItems.push({
                key,
                stateType,
                reference: rawData,
                subs,
                deps,
              })
            }

            return buildReactivityRelationships(stateItems)
          },
          (error) => ({ error }),
        )
        rpc.onReactivityRelationshipsUpdated(query.event, stringify(result))
      }
      catch (err) {
        rpc.onReactivityRelationshipsUpdated(query.event, { error: String(err) })
      }
    },
  },
  { timeout: -1 },
)

// ── Reactivity helpers ───────────────────────────────────────────────────

interface ReactivityDep {
  type: string
  reference: unknown
  data: Record<string, unknown>
}

interface ReactivityStateItem {
  key: string
  stateType: string
  reference: unknown
  subs: ReactivityDep[]
  deps: ReactivityDep[]
}

// Vue 3.5+ reactivity internals:
// - RefImpl/ComputedRefImpl have `.dep: Dep` (a Dep object that tracks subscribers)
// - Dep.subs is the TAIL of a doubly-linked list of Link nodes; walk with .prevSub
// - ComputedRefImpl implements Subscriber, so it has `.deps` (head) / `.depsTail` (tail)
// - ReactiveEffect also implements Subscriber with the same deps/depsTail
// - Link { sub: Subscriber, dep: Dep, nextDep, prevDep, nextSub, prevSub }

function getSubscriberType(sub: any): string {
  const name = sub?.constructor?.name
  if (name === 'ReactiveEffect') {
    if (sub.fn?.name === 'componentUpdateFn') return 'render'
    // Vue 3.5+ watch/watchEffect all use ReactiveEffect with a scheduler
    if (sub.scheduler) return 'watch'
    return 'effect'
  }
  if (name === 'ComputedRefImpl') return 'computed'
  if (sub?.__v_isRef === true) {
    if (typeof sub?.effect === 'object') return 'computed'
    return 'ref'
  }
  return 'unknown'
}

function processReactivitySubs(state: any): ReactivityDep[] {
  // Subscribers are at state.dep.subs (Link tail), walk backwards with prevSub
  const depObj = (state as any).dep
  if (!depObj?.subs) return []

  const result: ReactivityDep[] = []
  for (let link = depObj.subs; link; link = link.prevSub) {
    const sub = link.sub
    if (!sub) continue

    const type = getSubscriberType(sub)
    const data: Record<string, unknown> = {}

    if (type === 'render' || type === 'effect' || type === 'watch') {
      data.fn = sub.fn?.name || '(anonymous)'
    }
    else {
      data.value = sub._value ?? sub.value
    }

    result.push({ type, reference: sub, data })
  }
  return result
}

function processReactivityDeps(state: any): ReactivityDep[] {
  // Dependencies exist on Subscriber types (ComputedRefImpl, ReactiveEffect)
  // state.deps is the HEAD of the linked list, walk forward with nextDep
  if (!state.deps) return []

  const result: ReactivityDep[] = []
  for (let link = state.deps; link; link = link.nextDep) {
    const dep = link.dep
    if (!dep) continue

    if (dep.computed) {
      // This Dep belongs to a ComputedRefImpl — use the computed as the reference
      result.push({
        type: 'computed',
        reference: dep.computed,
        data: { value: dep.computed._value },
      })
    }
    else {
      // This is a plain Dep (ref or reactive property) — use Dep itself, resolve later
      result.push({
        type: 'dep',
        reference: dep,
        data: { key: dep.key },
      })
    }
  }
  return result
}

function buildReactivityRelationships(stateItems: ReactivityStateItem[]) {
  type GraphNode = { type: string; data: Record<string, unknown>; id: string }
  const nodeMap = new Map<unknown, GraphNode>()
  let idCounter = 0

  // Pre-build a Dep→stateItem map so deps can be resolved to their owning state item
  const depToItem = new Map<unknown, ReactivityStateItem>()
  for (const item of stateItems) {
    const depObj = (item.reference as any)?.dep
    if (depObj) depToItem.set(depObj, item)
  }

  // 1. Register all state items as graph nodes
  for (const item of stateItems) {
    if (!nodeMap.has(item.reference)) {
      nodeMap.set(item.reference, {
        type: item.stateType,
        data: { key: item.key, value: (item.reference as any)?._value ?? (item.reference as any)?.value },
        id: String(idCounter++),
      })
    }
  }

  // 2. Register external nodes (effects, watchers, computeds not in state items)
  for (const item of stateItems) {
    for (let i = 0; i < item.subs.length; i++) {
      const sub = item.subs[i]
      if (!nodeMap.has(sub.reference)) {
        nodeMap.set(sub.reference, { type: sub.type, data: { ...sub.data }, id: String(idCounter++) })
      }
    }
    for (let i = 0; i < item.deps.length; i++) {
      const dep = item.deps[i]
      // Resolve Dep objects to their owning state item's reference
      const resolvedRef = dep.type === 'dep' ? depToItem.get(dep.reference)?.reference : dep.reference
      if (resolvedRef && !nodeMap.has(resolvedRef)) {
        const matched = dep.type === 'dep' ? depToItem.get(dep.reference) : null
        nodeMap.set(resolvedRef, {
          type: matched ? matched.stateType : dep.type,
          data: matched ? { key: matched.key } : { ...dep.data },
          id: String(idCounter++),
        })
      }
    }
  }

  // 3. Build graph nodes array
  const graphNodes: GraphNode[] = []
  for (const value of nodeMap.values()) {
    graphNodes.push(value)
  }

  // 4. Build edges with inline deduplication (O(n) via Set)
  const edgeSet = new Set<string>()
  const relationships: { id: string; from: string; to: string }[] = []

  for (const item of stateItems) {
    const self = nodeMap.get(item.reference)
    if (!self) continue

    // Subs: item → subscriber (subscriber depends on item)
    for (let i = 0; i < item.subs.length; i++) {
      const subNode = nodeMap.get(item.subs[i].reference)
      if (!subNode) continue
      const key = self.id < subNode.id ? `${self.id}\0${subNode.id}` : `${subNode.id}\0${self.id}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        relationships.push({ id: String(idCounter++), from: self.id, to: subNode.id })
      }
    }

    // Deps: dependency → item (item depends on dependency)
    for (let i = 0; i < item.deps.length; i++) {
      const dep = item.deps[i]
      const resolvedRef = dep.type === 'dep' ? depToItem.get(dep.reference)?.reference : dep.reference
      if (!resolvedRef) continue
      const depNode = nodeMap.get(resolvedRef)
      if (!depNode) continue
      const key = depNode.id < self.id ? `${depNode.id}\0${self.id}` : `${self.id}\0${depNode.id}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        relationships.push({ id: String(idCounter++), from: depNode.id, to: self.id })
      }
    }
  }

  return { graphNodes, relationships }
}
