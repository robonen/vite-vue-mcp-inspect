import type { AllRpcFunctions, VueMcpContext } from './types.js'

/**
 * Creates the RPC handler object passed to `createRPCServer`.
 *
 * Two parts:
 * - Outgoing stubs (server → browser): no-op functions; the RPC framework
 *   serialises the call and sends it to the browser over WebSocket.
 * - Incoming callbacks (browser → server): fire the matching hookable event
 *   so the pending MCP tool promise resolves.
 */
export function createServerRpc(ctx: VueMcpContext): AllRpcFunctions {
  return {
    // ── Outgoing stubs (server → browser) ─────────────────────────────
    getInspectorTree: () => {},
    getDetailedComponentTree: () => {},
    getInspectorState: () => {},
    editComponentState: () => {},
    highlightComponent: () => {},
    scrollToComponent: () => {},
    getRouterInfo: () => {},
    getPiniaTree: () => {},
    getPiniaState: () => {},
    editPiniaState: () => {},
    navigateToRoute: () => {},
    getAppInfo: () => {},
    reloadApp: () => {},
    getComponentByFile: () => {},

    // ── Incoming callbacks (browser → server) ─────────────────────────
    onInspectorTreeUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
    onDetailedComponentTreeUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
    onInspectorStateUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
    onEditComponentStateDone(event, result) {
      ctx.hooks.callHook(event, result)
    },
    onHighlightComponentDone(event, result) {
      ctx.hooks.callHook(event, result)
    },
    onScrollToComponentDone(event, result) {
      ctx.hooks.callHook(event, result)
    },
    onRouterInfoUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
    onPiniaTreeUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
    onPiniaInfoUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
    onPiniaStateEditDone(event, result) {
      ctx.hooks.callHook(event, result)
    },
    onNavigateToRouteDone(event, result) {
      ctx.hooks.callHook(event, result)
    },
    onAppInfoUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
    onReloadAppDone(event) {
      ctx.hooks.callHook(event, null)
    },
    onComponentByFileUpdated(event, data) {
      ctx.hooks.callHook(event, data)
    },
  }
}
