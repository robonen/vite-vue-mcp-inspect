import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import { createRPCServer } from 'vite-dev-rpc'
import { searchForWorkspaceRoot, transformWithOxc } from 'vite'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { VueMcpOptions, IdeMcpConfig, ClaudeDesktopConfig, AllRpcFunctions, ServerRpcFunctions } from './types.js'
import { createVueMcpContext } from './context.js'
import { createServerRpc } from './rpc.js'
import { createMcpServer } from './server.js'
import { setupTransports } from './transport.js'
import { updateIdeConfigs } from './ide-config.js'
import type { IdeConfigOptions } from './ide-config.js'

export type { VueMcpOptions, VueMcpContext, IdeMcpConfig, ClaudeDesktopConfig } from './types.js'

const _dirname = fileURLToPath(new URL('.', import.meta.url))

const VIRTUAL_MODULE_ID = 'virtual:vue-mcp-overlay'
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`

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

export default function VueMcp(options: VueMcpOptions = {}): Plugin {
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
      // Resolve imports from the virtual overlay using the plugin's own
      // node_modules so that @vue/devtools-kit etc. are found even when
      // the consuming project doesn't directly depend on them.
      if (importer === RESOLVED_VIRTUAL_ID) {
        return this.resolve(id, path.resolve(_dirname, '_overlay_importer.js'), { skipSelf: true })
      }
    },

    async load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        if (!overlaySource) {
          const overlayPath = path.resolve(_dirname, '../src/client/overlay.ts')
          const altPath = path.resolve(_dirname, 'client/overlay.ts')
          const filePath = existsSync(overlayPath) ? overlayPath : altPath
          overlaySource = readFileSync(filePath, 'utf-8')
        }
        const result = await transformWithOxc(overlaySource, 'overlay.ts')
        return result.code
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
      const pattern = appendTo instanceof RegExp ? appendTo : new RegExp(`${appendTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      if (pattern.test(id)) {
        return {
          code: `${code}\nimport "${VIRTUAL_MODULE_ID}"`,
          map: null,
        }
      }
    },

    async configureServer(vite: ViteDevServer) {
      // Create RPC bridge between server and browser
      const rpcHandlers = createServerRpc(ctx)
      ctx.rpcServer = createRPCServer<ServerRpcFunctions, AllRpcFunctions>(
        'vite-vue-mcp-inspect',
        vite.ws,
        rpcHandlers,
        { timeout: -1 },
      ) as any

      // MCP server factory — each transport connection gets its own instance
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

      // Register transports
      const cleanup = await setupTransports(mcpPath, createServer, vite)

      // Cleanup on server close
      vite.httpServer?.on('close', () => {
        cleanup().catch(() => {})
      })

      // Resolve URLs
      const resolvedHost = _host ?? 'localhost'
      const address = vite.httpServer?.address()
      const port = typeof address === 'object' && address ? address.port : 5173
      const protocol = getMcpProtocol(config)

      const mcpUrl = `${protocol}://${resolvedHost}:${port}${mcpPath}/mcp`

      // Update IDE configs + print URL once the server is listening
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
