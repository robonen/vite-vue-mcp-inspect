import {
  activeAppRecord,
  devtoolsRouterInfo,
  devtoolsState,
} from '@vue/devtools-kit'

export function createAppHandlers(getRpc: () => any) {
  return {
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
        getRpc().onAppInfoUpdated(query.event, info)
      }
      catch (err) {
        getRpc().onAppInfoUpdated(query.event, { error: String(err) })
      }
    },

    // ── Reload app ──────────────────────────────────────────────────────
    async reloadApp(query: { event: string }) {
      getRpc().onReloadAppDone(query.event)
      await new Promise(r => setTimeout(r, 50))
      location.reload()
    },
  }
}
