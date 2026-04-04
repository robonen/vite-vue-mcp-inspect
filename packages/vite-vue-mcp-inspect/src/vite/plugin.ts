import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import { createRPCServer } from 'vite-dev-rpc'
import { searchForWorkspaceRoot } from 'vite'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { createVueMcpContext } from '../core/rpc.ts'
import { createServerRpc } from '../core/rpc.ts'
import { createMcpServer } from '../core/server.ts'
import { setupTransports } from '../core/transport.ts'
import type { AllRpcFunctions, ClaudeDesktopConfig, IdeMcpConfig, ServerRpcFunctions, VueMcpOptions } from '../core/types.ts'
import { updateIdeConfigs } from './ide-config.ts'
import type { IdeConfigOptions } from './ide-config.ts'

const VIRTUAL_MODULE_ID = 'virtual:vue-mcp-overlay'
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`

const _dirname = fileURLToPath(new URL('.', import.meta.url))

function getOverlayPath(): string {
  return path.resolve(_dirname, 'overlay.js')
}

function resolveIdeMcpConfig(
  opt: boolean | IdeMcpConfig | undefined,
  defaultEnabled: boolean,
): false | { serverName: string } {
  if (opt === false) return false
  if (opt === true || opt === undefined) {
    return defaultEnabled ? { serverName: 'vue-mcp' } : false
  }
  if (opt.enabled === false) return false
  return { serverName: opt.serverName ?? 'vue-mcp' }
}

function resolveClaudeDesktopConfig(
  opt: boolean | ClaudeDesktopConfig | undefined,
): false | { serverName: string; configPath: string } {
  if (!opt) return false
  if (opt === true) return { serverName: 'vue-mcp', configPath: '' }
  if (opt.enabled === false) return false
  return {
    serverName: opt.serverName ?? 'vue-mcp',
    configPath: opt.configPath ?? '',
  }
}

function getMcpProtocol(config: ResolvedConfig): 'http' | 'https' {
  return config.server.https ? 'https' : 'http'
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
        return this.resolve(id, getOverlayPath(), { skipSelf: true })
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        if (!overlaySource) {
          overlaySource = readFileSync(getOverlayPath(), 'utf-8')
        }
        return overlaySource
      }
    },

    transformIndexHtml() {
      if (appendTo) return []
      return [{
        tag: 'script',
        attrs: { type: 'module', src: '/@id/__x00__virtual:vue-mcp-overlay' },
        injectTo: 'head-prepend' as const,
      }]
    },

    transform(code, id) {
      if (!appendTo) return
      const pattern = appendTo instanceof RegExp
        ? appendTo
        : new RegExp(`${appendTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      if (pattern.test(id)) {
        return {
          code: `${code}\nimport "${VIRTUAL_MODULE_ID}"`,
          map: null,
        }
      }
    },

    async configureServer(vite: ViteDevServer) {
      const rpcHandlers = createServerRpc(ctx)
      ctx.rpcServer = createRPCServer<ServerRpcFunctions, AllRpcFunctions>(
        'vite-vue-mcp-inspect',
        vite.ws,
        rpcHandlers,
        { timeout: -1 },
      ) as any

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

      vite.httpServer?.on('close', () => {
        cleanup().catch(() => {})
      })

      const resolvedHost = _host ?? 'localhost'
      const address = vite.httpServer?.address()
      const port = typeof address === 'object' && address ? address.port : 5173
      const protocol = getMcpProtocol(config)
      const mcpUrl = `${protocol}://${resolvedHost}:${port}${mcpPath}/mcp`
      const root = searchForWorkspaceRoot(config.root)

      const ideOpts: IdeConfigOptions = {
        root,
        mcpUrl,
        cursor: resolveIdeMcpConfig(options.updateCursorMcpJson, true),
        windsurf: resolveIdeMcpConfig(options.updateWindsurfMcpJson, true),
        vscode: resolveIdeMcpConfig(options.updateVscodeMcpJson, true),
        claudeDesktop: resolveClaudeDesktopConfig(options.updateClaudeDesktopConfig),
      }

      if (vite.httpServer) {
        vite.httpServer.once('listening', () => {
          const actualAddress = vite.httpServer?.address()
          const actualPort = typeof actualAddress === 'object' && actualAddress ? actualAddress.port : port
          const actualMcpUrl = `${protocol}://${resolvedHost}:${actualPort}${mcpPath}/mcp`

          if (printUrl) {
            setTimeout(() => {
              console.log(
                `  ${ansis.green('➜')}  ${ansis.bold('MCP')}: ${ansis.cyan(actualMcpUrl)}`,
              )
            }, 0)
          }

          ideOpts.mcpUrl = actualMcpUrl
          updateIdeConfigs(ideOpts).catch((err) => {
            console.warn(`[vue-mcp] IDE config update failed: ${err}`)
          })
        })
      }
      else {
        updateIdeConfigs(ideOpts).catch((err) => {
          console.warn(`[vue-mcp] IDE config update failed: ${err}`)
        })
      }
    },
  }
}
