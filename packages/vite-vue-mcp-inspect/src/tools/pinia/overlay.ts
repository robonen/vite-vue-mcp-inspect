import {
  devtools,
  getInspector,
} from '@vue/devtools-kit'
import {
  DEVTOOLS_TIMEOUT,
  PINIA_INSPECTOR_ID,
  stringify,
  withHighPerfDisabled,
  withTimeout,
} from '../overlay-utils.ts'

/** Run fn with a Pinia inspector's selectedNodeId temporarily set to storeName. */
async function withPiniaStore<T>(storeName: string, fn: () => Promise<T>): Promise<T> {
  const inspector = getInspector(PINIA_INSPECTOR_ID)
  const prevNodeId = inspector?.selectedNodeId
  try {
    if (inspector) inspector.selectedNodeId = storeName
    return await fn()
  }
  finally {
    if (inspector && prevNodeId !== undefined) inspector.selectedNodeId = prevNodeId
  }
}

export function createPiniaHandlers() {
  return {
    // ── Pinia tree ──────────────────────────────────────────────────────
    async getPiniaTree() {
      return withHighPerfDisabled(() =>
        withTimeout(
          devtools.api.getInspectorTree({
            inspectorId: PINIA_INSPECTOR_ID,
            filter: '',
          }),
          DEVTOOLS_TIMEOUT,
          'getInspectorTree(pinia)',
        ),
      )
    },

    // ── Pinia state ─────────────────────────────────────────────────────
    async getPiniaState(query: { storeName: string }) {
      return withHighPerfDisabled(() =>
        withPiniaStore(query.storeName, async () => {
          const state = await withTimeout(
            (devtools as any).ctx.api.getInspectorState({
              inspectorId: PINIA_INSPECTOR_ID,
              nodeId: query.storeName,
            }),
            DEVTOOLS_TIMEOUT,
            'getInspectorState(pinia)',
          )
          return JSON.parse(stringify(state as object) as string)
        }),
      )
    },

    // ── Edit Pinia state ────────────────────────────────────────────────
    async editPiniaState(query: {
      storeName: string
      path: string[]
      value: string
      valueType: string
    }) {
      return withHighPerfDisabled(async () => {
        const inspector = getInspector(PINIA_INSPECTOR_ID)
        if (!inspector) {
          return { success: false as const, error: 'Pinia inspector not found' }
        }
        return withPiniaStore(query.storeName, async () => {
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
          return { success: true as const }
        })
      })
    },
  }
}
