import {
  activeAppRecord,
  devtoolsRouterInfo,
} from '@vue/devtools-kit'

export function createRouterHandlers() {
  return {
    // ── Router info ─────────────────────────────────────────────────────
    async getRouterInfo() {
      return JSON.parse(JSON.stringify(devtoolsRouterInfo))
    },

    // ── Navigate to route ────────────────────────────────────────────────
    async navigateToRoute(query: { path: string }) {
      const router = activeAppRecord.value?.app?.config?.globalProperties?.$router
      if (!router) {
        return {
          success: false as const,
          error: 'Vue Router not detected. Make sure vue-router is installed and configured.',
        }
      }
      await router.push(query.path)
      return { success: true as const }
    },
  }
}
