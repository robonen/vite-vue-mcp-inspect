import { activeAppRecord } from '@vue/devtools-kit'
import { stringify, withComponentNode } from '../overlay-utils.ts'

export function createReactivityHandlers(getRpc: () => any) {
  return {
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
        getRpc().onReactivityRelationshipsUpdated(query.event, stringify(result))
      }
      catch (err) {
        getRpc().onReactivityRelationshipsUpdated(query.event, { error: String(err) })
      }
    },
  }
}

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

function getSubscriberType(sub: any): string {
  const name = sub?.constructor?.name
  if (name === 'ReactiveEffect') {
    if (sub.fn?.name === 'componentUpdateFn') return 'render'
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
  const depObj = (state as any).dep
  if (!depObj?.subs) return []

  const result: ReactivityDep[] = []
  for (let link = depObj.subs; link; link = link.prevSub) {
    const sub = link.sub
    if (!sub) continue

    const type = getSubscriberType(sub)
    let fn: unknown = null
    let value: unknown = null
    let key: unknown = null

    if (type === 'render' || type === 'effect' || type === 'watch') {
      fn = sub.fn?.name || '(anonymous)'
    }
    else {
      value = sub._value ?? sub.value
    }

    result.push({ type, reference: sub, data: { fn, value, key } })
  }
  return result
}

function processReactivityDeps(state: any): ReactivityDep[] {
  if (!state.deps) return []

  const result: ReactivityDep[] = []
  for (let link = state.deps; link; link = link.nextDep) {
    const dep = link.dep
    if (!dep) continue

    if (dep.computed) {
      result.push({
        type: 'computed',
        reference: dep.computed,
        data: { fn: null, value: dep.computed._value, key: null },
      })
    }
    else {
      result.push({
        type: 'dep',
        reference: dep,
        data: { fn: null, value: null, key: dep.key },
      })
    }
  }
  return result
}

function buildReactivityRelationships(stateItems: ReactivityStateItem[]) {
  interface GraphNode { type: string; data: Record<string, unknown>; id: string }
  const nodeMap = new Map<unknown, GraphNode>()
  let idCounter = 0

  const depToItem = new Map<unknown, ReactivityStateItem>()
  for (const item of stateItems) {
    const depObj = (item.reference as any)?.dep
    if (depObj) depToItem.set(depObj, item)
  }

  for (const item of stateItems) {
    if (!nodeMap.has(item.reference)) {
      nodeMap.set(item.reference, {
        type: item.stateType,
        data: { fn: null, value: (item.reference as any)?._value ?? (item.reference as any)?.value, key: item.key },
        id: String(idCounter++),
      })
    }
  }

  for (const item of stateItems) {
    for (const sub of item.subs) {
      if (!nodeMap.has(sub.reference)) {
        nodeMap.set(sub.reference, { type: sub.type, data: { fn: sub.data.fn, value: sub.data.value, key: sub.data.key }, id: String(idCounter++) })
      }
    }
    for (const dep of item.deps) {
      const resolvedRef = dep.type === 'dep' ? depToItem.get(dep.reference)?.reference : dep.reference
      if (resolvedRef && !nodeMap.has(resolvedRef)) {
        const matched = dep.type === 'dep' ? depToItem.get(dep.reference) : null
        nodeMap.set(resolvedRef, {
          type: matched ? matched.stateType : dep.type,
          data: matched ? { fn: null, value: null, key: matched.key } : { fn: dep.data.fn, value: dep.data.value, key: dep.data.key },
          id: String(idCounter++),
        })
      }
    }
  }

  const graphNodes: GraphNode[] = []
  for (const value of nodeMap.values()) {
    graphNodes.push(value)
  }

  const edgeSet = new Set<string>()
  const relationships: Array<{ id: string; from: string; to: string }> = []

  for (const item of stateItems) {
    const self = nodeMap.get(item.reference)
    if (!self) continue

    for (const sub of item.subs) {
      const subNode = nodeMap.get(sub.reference)
      if (!subNode) continue
      const key = self.id < subNode.id ? `${self.id}\0${subNode.id}` : `${subNode.id}\0${self.id}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        relationships.push({ id: String(idCounter++), from: self.id, to: subNode.id })
      }
    }

    for (const dep of item.deps) {
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
