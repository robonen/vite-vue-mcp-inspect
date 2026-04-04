import {
  activeAppRecord,
  devtoolsRouterInfo,
} from '@vue/devtools-kit'

export function createRouterHandlers(getRpc: () => any) {
  return {
    // ── Router info ─────────────────────────────────────────────────────
    async getRouterInfo(query: { event: string }) {
      try {
        getRpc().onRouterInfoUpdated(query.event, JSON.parse(JSON.stringify(devtoolsRouterInfo)))
      }
      catch (err) {
        getRpc().onRouterInfoUpdated(query.event, { error: String(err) })
      }
    },

    // ── Navigate to route ────────────────────────────────────────────────
    async navigateToRoute(query: { path: string; event: string }) {
      try {
        const router = activeAppRecord.value?.app?.config?.globalProperties?.$router
        if (!router) {
          getRpc().onNavigateToRouteDone(query.event, {
            success: false,
            error: 'Vue Router not detected. Make sure vue-router is installed and configured.',
          })
          return
        }
        await router.push(query.path)
        getRpc().onNavigateToRouteDone(query.event, { success: true })
      }
      catch (err) {
        getRpc().onNavigateToRouteDone(query.event, { success: false, error: String(err) })
      }
    },
  }
}
