import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { noop } from '@robonen/stdlib'
import ansis from 'ansis'
import { searchForWorkspaceRoot } from 'vite'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { createHotRpc, createVueMcpContext } from './core/rpc'
import { createMcpServer } from './core/server'
import { setupTransports } from './core/transport'
import type { AddressInfo } from 'node:net'
import type { ClaudeDesktopConfig, IdeMcpConfig, VueMcpOptions } from './core/types'
import { updateIdeConfigs } from './ide-config'
import type { IdeConfigOptions } from './ide-config'
import { PLUGIN_NAME } from './constants'

const VIRTUAL_MODULE_ID = `virtual:${PLUGIN_NAME}-overlay`
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`

const CLIENT_PATH = path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'client.js')

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Hook filters must be RegExps, not strings — Vite resolves a string pattern as
 * a picomatch glob joined against `cwd`, which would mangle a `\0virtual:` id.
 */
const RESOLVED_VIRTUAL_FILTER = new RegExp(`^\\0${escapeRegExp(VIRTUAL_MODULE_ID)}$`)

function resolveIdeMcpConfig(
  opt: boolean | IdeMcpConfig | undefined,
  defaultEnabled: boolean,
): false | { serverName: string } {
  if (opt === false || (opt === undefined && !defaultEnabled)) return false
  if (opt === true || opt === undefined) return { serverName: PLUGIN_NAME }
  if (opt.enabled === false) return false
  return { serverName: opt.serverName ?? PLUGIN_NAME }
}

function resolveClaudeDesktopConfig(
  opt: boolean | ClaudeDesktopConfig | undefined,
): false | { serverName: string; configPath: string } {
  if (!opt) return false
  if (opt === true) return { serverName: PLUGIN_NAME, configPath: '' }
  if (opt.enabled === false) return false
  return { serverName: opt.serverName ?? PLUGIN_NAME, configPath: opt.configPath ?? '' }
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
      ? new RegExp(`${escapeRegExp(appendTo)}$`)
      : null

  let config: ResolvedConfig
  let clientSource: string | null = null

  return {
    name: PLUGIN_NAME,
    apply: 'serve',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    // Not filterable: the second branch keys off `importer`, and hook filters
    // can only match `id`. Bare imports inside client.js arrive with arbitrary
    // ids and must still resolve relative to the real file on disk.
    resolveId(id, importer) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID
      if (importer === RESOLVED_VIRTUAL_ID) {
        return this.resolve(id, CLIENT_PATH, { skipSelf: true })
      }
      return undefined
    },

    load: {
      filter: { id: RESOLVED_VIRTUAL_FILTER },
      handler() {
        clientSource ??= readFileSync(CLIENT_PATH, 'utf-8')
        return clientSource
      },
    },

    transformIndexHtml() {
      if (appendTo) return []
      return [{
        tag: 'script',
        attrs: { type: 'module', src: `/@id/__x00__${VIRTUAL_MODULE_ID}` },
        injectTo: 'head-prepend' as const,
      }]
    },

    // Only registered when `appendTo` is set, so the default path adds no
    // transform hook at all. The import is appended at end-of-file, which moves
    // no existing code — `map: null` therefore keeps upstream sourcemaps valid.
    transform: appendPattern
      ? {
          filter: { id: appendPattern },
          handler(code) {
            return { code: `${code}\nimport "${VIRTUAL_MODULE_ID}"`, map: null }
          },
        }
      : undefined,

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
        console.warn(`[${PLUGIN_NAME}] IDE config update failed: ${err}`)
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
