import {
  activeAppRecord,
  devtoolsRouterInfo,
  devtoolsState,
} from '@vue/devtools-kit'

export function createAppHandlers() {
  return {
    // ── App info ────────────────────────────────────────────────────────
    async getAppInfo() {
      const appRecord = activeAppRecord.value
      const vueApp = appRecord?.app
      return {
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
    },

    // ── Reload app ──────────────────────────────────────────────────────
    async reloadApp() {
      setTimeout(() => location.reload(), 50)
    },
  }
}
