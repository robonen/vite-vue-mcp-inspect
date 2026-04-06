import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { BirpcReturn } from 'birpc'
import type { MaybePromise } from '@robonen/stdlib'
import type { ViteDevServer } from 'vite'

// ── IDE config options ─────────────────────────────────────────────────────

export interface IdeMcpConfig {
  /**
   * Enable/disable config writing for this IDE.
   * @default true (only when the IDE directory exists)
   */
  enabled?: boolean
  /**
   * The MCP server name key in the IDE config.
   * @default 'vite-vue-mcp-inspect'
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
  /** @default 'vite-vue-mcp-inspect' */
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
  mcpServer?: (viteServer: ViteDevServer, ctx: VueMcpContext) => MaybePromise<McpServer>

  /**
   * Hook called after the MCP server is created. You can add tools or
   * return a replacement McpServer instance.
   */
  mcpServerSetup?: (server: McpServer, viteServer: ViteDevServer) => MaybePromise<void | McpServer>

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

// ── Browser RPC functions ──────────────────────────────────────────────────
// The browser exposes these functions; the server calls them via birpc.
// Each returns its result directly (birpc handles request-response).

export interface BrowserRpcFunctions {
  getInspectorTree(): unknown
  getDetailedComponentTree(): unknown
  getInspectorState(query: { componentName: string }): unknown
  editComponentState(query: {
    componentName: string
    path: string[]
    value: string
    valueType: string
  }): { success: boolean; error?: string }
  highlightComponent(query: { componentName: string }): { success: boolean; error?: string }
  scrollToComponent(query: { componentName: string }): { success: boolean; error?: string }
  getRouterInfo(): unknown
  getPiniaTree(): unknown
  getPiniaState(query: { storeName: string }): unknown
  editPiniaState(query: {
    storeName: string
    path: string[]
    value: string
    valueType: string
  }): { success: boolean; error?: string }
  navigateToRoute(query: { path: string }): { success: boolean; error?: string }
  getAppInfo(): unknown
  reloadApp(): void
  getComponentByFile(query: { filePath: string }): unknown
  getReactivityRelationships(query: { componentName: string }): unknown
}

// ── Context ────────────────────────────────────────────────────────────────

export interface VueMcpContext {
  /** birpc instance using Vite's HMR WebSocket. Populated in configureServer. */
  rpc: BirpcReturn<BrowserRpcFunctions, Record<string, never>> | null
}
