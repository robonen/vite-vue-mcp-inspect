import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { noop } from '@robonen/stdlib'
import ansis from 'ansis'
import { searchForWorkspaceRoot } from 'vite'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { createVueMcpContext, createHotRpc } from '../core/rpc.ts'
import { createMcpServer } from '../core/server.ts'
import { setupTransports } from '../core/transport.ts'
import type { AddressInfo } from 'node:net'
import type { ClaudeDesktopConfig, IdeMcpConfig, VueMcpOptions } from '../core/types.ts'
import { updateIdeConfigs } from './ide-config.ts'
import type { IdeConfigOptions } from './ide-config.ts'

const VIRTUAL_MODULE_ID = 'virtual:vite-vue-mcp-inspect-overlay'
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`

const OVERLAY_PATH = path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'overlay.js')

function resolveIdeMcpConfig(
  opt: boolean | IdeMcpConfig | undefined,
  defaultEnabled: boolean,
): false | { serverName: string } {
  if (opt === false || (opt === undefined && !defaultEnabled)) return false
  if (opt === true || opt === undefined) return { serverName: 'vite-vue-mcp-inspect' }
  if (opt.enabled === false) return false
  return { serverName: opt.serverName ?? 'vite-vue-mcp-inspect' }
}

function resolveClaudeDesktopConfig(
  opt: boolean | ClaudeDesktopConfig | undefined,
): false | { serverName: string; configPath: string } {
  if (!opt) return false
  if (opt === true) return { serverName: 'vite-vue-mcp-inspect', configPath: '' }
  if (opt.enabled === false) return false
  return { serverName: opt.serverName ?? 'vite-vue-mcp-inspect', configPath: opt.configPath ?? '' }
}

function resolvePort(address: AddressInfo | string | null): number {
  return typeof address === 'object' && address ? address.port : 5173
}

export function createVueMcpPlugin(options: VueMcpOptions = {}): Plugin {
  const {
    host: _host,
    printUrl = true,
    mcpPath = '/__mcp',
    browserTimeout = 10_000,
    appendTo,
  } = options

  const ctx = createVueMcpContext()
  const appendPattern = appendTo instanceof RegExp
    ? appendTo
    : appendTo
      ? new RegExp(`${appendTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      : null

  let config: ResolvedConfig
  let overlaySource: string | null = null

  return {
    name: 'vite-vue-mcp-inspect',
    apply: 'serve',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    resolveId(id, importer) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID
      if (importer === RESOLVED_VIRTUAL_ID) {
        return this.resolve(id, OVERLAY_PATH, { skipSelf: true })
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        overlaySource ??= readFileSync(OVERLAY_PATH, 'utf-8')
        return overlaySource
      }
    },

    transformIndexHtml() {
      if (appendTo) return []
      return [{
        tag: 'script',
        attrs: { type: 'module', src: '/@id/__x00__virtual:vite-vue-mcp-inspect-overlay' },
        injectTo: 'head-prepend' as const,
      }]
    },

    transform(code, id) {
      if (appendPattern?.test(id)) {
        return { code: `${code}\nimport "${VIRTUAL_MODULE_ID}"`, map: null }
      }
    },

    async configureServer(vite: ViteDevServer) {
      const resolvedHost = _host ?? 'localhost'

      ctx.rpc = createHotRpc(vite.hot)

      const createServer = async () => {
        let mcpServer = options.mcpServer
          ? await options.mcpServer(vite, ctx)
          : createMcpServer(options, ctx, browserTimeout)

        if (options.mcpServerSetup) {
          const replacement = await options.mcpServerSetup(mcpServer, vite)
          if (replacement) mcpServer = replacement
        }
        return mcpServer
      }

      const cleanup = await setupTransports(mcpPath, createServer, vite)
      vite.httpServer?.on('close', () => { cleanup().catch(noop) })

      const protocol = config.server.https ? 'https' : 'http'
      const root = searchForWorkspaceRoot(config.root)
      const buildMcpUrl = (port: number) => `${protocol}://${resolvedHost}:${port}${mcpPath}/mcp`

      const ideOpts: IdeConfigOptions = {
        root,
        mcpUrl: buildMcpUrl(resolvePort(vite.httpServer?.address() ?? null)),
        cursor: resolveIdeMcpConfig(options.updateCursorMcpJson, true),
        windsurf: resolveIdeMcpConfig(options.updateWindsurfMcpJson, true),
        vscode: resolveIdeMcpConfig(options.updateVscodeMcpJson, true),
        claudeDesktop: resolveClaudeDesktopConfig(options.updateClaudeDesktopConfig),
      }

      const applyIdeConfigs = () => updateIdeConfigs(ideOpts).catch((err) => {
        console.warn(`[vite-vue-mcp-inspect] IDE config update failed: ${err}`)
      })

      if (vite.httpServer) {
        vite.httpServer.once('listening', () => {
          ideOpts.mcpUrl = buildMcpUrl(resolvePort(vite.httpServer!.address()))
          if (printUrl) {
            setTimeout(() => {
              console.log(`  ${ansis.green('➜')}  ${ansis.bold('MCP')}: ${ansis.cyan(ideOpts.mcpUrl)}`)
            }, 0)
          }
          applyIdeConfigs()
        })
      }
      else {
        applyIdeConfigs()
      }
    },
  }
}
