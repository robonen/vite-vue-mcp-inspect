import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Hookable } from 'hookable'
import type { BirpcGroupReturn } from 'birpc'
import type { ViteDevServer } from 'vite'

type Awaitable<T> = T | Promise<T>

// ── IDE config options ─────────────────────────────────────────────────────

export interface IdeMcpConfig {
  /**
   * Enable/disable config writing for this IDE.
   * @default true (only when the IDE directory exists)
   */
  enabled?: boolean
  /**
   * The MCP server name key in the IDE config.
   * @default 'vue-mcp'
   */
  serverName?: string
}

export interface ClaudeDesktopConfig {
  enabled: boolean
  /**
   * Full path to claude_desktop_config.json.
   * Defaults to the platform-specific location.
   */
  configPath?: string
  /** @default 'vue-mcp' */
  serverName?: string
}

// ── Plugin options ─────────────────────────────────────────────────────────

export interface VueMcpOptions {
  /**
   * The hostname to listen on.
   * @default 'localhost'
   */
  host?: string

  /**
   * Print the MCP server URLs in the console.
   * @default true
   */
  printUrl?: boolean

  /**
   * Custom MCP server factory. When provided, built-in tools are skipped.
   */
  mcpServer?: (viteServer: ViteDevServer, ctx: VueMcpContext) => Awaitable<McpServer>

  /**
   * Hook called after the MCP server is created. You can add tools or
   * return a replacement McpServer instance.
   */
  mcpServerSetup?: (server: McpServer, viteServer: ViteDevServer) => Awaitable<void | McpServer>

  /**
   * Override the MCP server name/version info.
   */
  mcpServerInfo?: { name: string; version: string }

  /**
   * The path prefix for MCP routes.
   * @default '/__mcp'
   */
  mcpPath?: string

  /**
   * Timeout in milliseconds before browser-dependent tools return an error.
   * @default 10000
   */
  browserTimeout?: number

  /**
   * Update `.cursor/mcp.json` with the MCP URL if `.cursor/` exists.
   * @default true
   */
  updateCursorMcpJson?: boolean | IdeMcpConfig

  /**
   * Update `.windsurf/mcp.json` with the MCP URL if `.windsurf/` exists.
   * @default true
   */
  updateWindsurfMcpJson?: boolean | IdeMcpConfig

  /**
   * Update `.vscode/mcp.json` with the MCP URL if `.vscode/` exists.
   * @default true
   */
  updateVscodeMcpJson?: boolean | IdeMcpConfig

  /**
   * Update the Claude Desktop config file with the MCP URL.
   * Opt-in because the config file location is global (not project-local).
   * @default false
   */
  updateClaudeDesktopConfig?: boolean | ClaudeDesktopConfig

  /**
   * Append an import to the module ending with `appendTo` instead of
   * injecting a <script> tag. Useful for non-HTML entry points.
   *
   * @default undefined (injects via <script> in HTML)
   */
  appendTo?: string | RegExp
}

// ── RPC shapes ─────────────────────────────────────────────────────────────
// Server → Browser: triggers actions in the browser
export interface ServerRpcFunctions {
  getInspectorTree(query: { event: string }): void
  getDetailedComponentTree(query: { event: string }): void
  getInspectorState(query: { event: string; componentName: string }): void
  editComponentState(query: {
    componentName: string
    path: string[]
    value: string
    valueType: string
    event: string
  }): void
  highlightComponent(query: { componentName: string; event: string }): void
  scrollToComponent(query: { componentName: string; event: string }): void
  getRouterInfo(query: { event: string }): void
  getPiniaTree(query: { event: string }): void
  getPiniaState(query: { event: string; storeName: string }): void
  editPiniaState(query: {
    storeName: string
    path: string[]
    value: string
    valueType: string
    event: string
  }): void
  navigateToRoute(query: { path: string; event: string }): void
  getAppInfo(query: { event: string }): void
  reloadApp(query: { event: string }): void
  getComponentByFile(query: { filePath: string; event: string }): void
  getReactivityRelationships(query: { event: string; componentName: string }): void
}

// Browser → Server: callbacks that resolve pending MCP tool promises
export interface ClientRpcFunctions {
  onInspectorTreeUpdated(event: string, data: unknown): void
  onDetailedComponentTreeUpdated(event: string, data: unknown): void
  onInspectorStateUpdated(event: string, data: unknown): void
  onEditComponentStateDone(event: string, result: { success: boolean; error?: string }): void
  onHighlightComponentDone(event: string, result: { success: boolean; error?: string }): void
  onScrollToComponentDone(event: string, result: { success: boolean; error?: string }): void
  onRouterInfoUpdated(event: string, data: unknown): void
  onPiniaTreeUpdated(event: string, data: unknown): void
  onPiniaInfoUpdated(event: string, data: unknown): void
  onPiniaStateEditDone(event: string, result: { success: boolean; error?: string }): void
  onNavigateToRouteDone(event: string, result: { success: boolean; error?: string }): void
  onAppInfoUpdated(event: string, data: unknown): void
  onReloadAppDone(event: string): void
  onComponentByFileUpdated(event: string, data: unknown): void
  onReactivityRelationshipsUpdated(event: string, data: unknown): void
}

export type AllRpcFunctions = ServerRpcFunctions & ClientRpcFunctions

// ── Context ────────────────────────────────────────────────────────────────

export interface VueMcpContext {
  hooks: Hookable<Record<string, any>>
  /** Populated in configureServer. Null before plugin initialises. */
  rpcServer: BirpcGroupReturn<ServerRpcFunctions> | null
}
