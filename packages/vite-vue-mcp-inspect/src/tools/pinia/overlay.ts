import {
  devtools,
  devtoolsState,
  getInspector,
  toggleHighPerfMode,
} from '@vue/devtools-kit'
import {
  DEVTOOLS_TIMEOUT,
  PINIA_INSPECTOR_ID,
  stringify,
  withTimeout,
} from '../overlay-utils.ts'

export function createPiniaHandlers(getRpc: () => any) {
  return {
    // ── Pinia tree ──────────────────────────────────────────────────────
    async getPiniaTree(query: { event: string }) {
      const wasHighPerf = devtoolsState.highPerfModeEnabled
      if (wasHighPerf) toggleHighPerfMode(false)
      try {
        const tree = await withTimeout(
          devtools.api.getInspectorTree({
            inspectorId: PINIA_INSPECTOR_ID,
            filter: '',
          }),
          DEVTOOLS_TIMEOUT,
          'getInspectorTree(pinia)',
        )
        getRpc().onPiniaTreeUpdated(query.event, tree)
      }
      catch (err) {
        getRpc().onPiniaTreeUpdated(query.event, { error: String(err) })
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
          const state = await withTimeout(
            (devtools as any).ctx.api.getInspectorState({
              inspectorId: PINIA_INSPECTOR_ID,
              nodeId: query.storeName,
            }),
            DEVTOOLS_TIMEOUT,
            'getInspectorState(pinia)',
          )
          getRpc().onPiniaInfoUpdated(query.event, stringify(state as object))
        }
        finally {
          if (inspector && prevNodeId !== undefined) inspector.selectedNodeId = prevNodeId
        }
      }
      catch (err) {
        getRpc().onPiniaInfoUpdated(query.event, { error: String(err) })
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
          getRpc().onPiniaStateEditDone(query.event, { success: false, error: 'Pinia inspector not found' })
          return
        }
        const prevNodeId = inspector.selectedNodeId
        try {
          inspector.selectedNodeId = query.storeName
          await withTimeout(
            (devtools as any).ctx.api.editInspectorState({
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
            }),
            DEVTOOLS_TIMEOUT,
            'editInspectorState(pinia)',
          )
          getRpc().onPiniaStateEditDone(query.event, { success: true })
        }
        finally {
          if (prevNodeId !== undefined) inspector.selectedNodeId = prevNodeId
        }
      }
      catch (err) {
        getRpc().onPiniaStateEditDone(query.event, { success: false, error: String(err) })
      }
      finally {
        if (wasHighPerf) toggleHighPerfMode(true)
      }
    },
  }
}
