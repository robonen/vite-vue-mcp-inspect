import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export interface IdeConfigOptions {
  /** Workspace root (from searchForWorkspaceRoot) */
  root: string
  /** Streamable HTTP endpoint URL, e.g. http://localhost:5173/__mcp/mcp or https://localhost:5173/__mcp/mcp */
  mcpUrl: string
  cursor: false | { serverName: string }
  windsurf: false | { serverName: string }
  vscode: false | { serverName: string }
  claudeDesktop: false | { serverName: string; configPath: string }
}

async function writeJsonConfig(filePath: string, update: (existing: Record<string, any>) => void): Promise<void> {
  let json: Record<string, any> = {}
  if (existsSync(filePath)) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      json = JSON.parse(raw || '{}')
    }
    catch {
      // Treat unparseable file as empty
    }
  }
  update(json)
  await fs.writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`)
}

export async function updateIdeConfigs(opts: IdeConfigOptions): Promise<void> {
  const { root, mcpUrl, cursor, windsurf, vscode, claudeDesktop } = opts

  interface IdeEntry {
    config: false | { serverName: string; configPath?: string }
    dir: string | null
    configFile: string
    update: (json: Record<string, any>, serverName: string, url: string) => void
    label: string
  }

  const entries: IdeEntry[] = [
    {
      config: cursor,
      dir: path.join(root, '.cursor'),
      configFile: 'mcp.json',
      update: (json, name, url) => { json.mcpServers ??= {}; json.mcpServers[name] = { url } },
      label: '.cursor/mcp.json',
    },
    {
      config: windsurf,
      dir: path.join(root, '.windsurf'),
      configFile: 'mcp.json',
      update: (json, name, url) => { json.mcpServers ??= {}; json.mcpServers[name] = { serverUrl: url } },
      label: '.windsurf/mcp.json',
    },
    {
      config: vscode,
      dir: path.join(root, '.vscode'),
      configFile: 'mcp.json',
      update: (json, name, url) => { json.servers ??= {}; json.servers[name] = { type: 'http', url } },
      label: '.vscode/mcp.json',
    },
  ]

  for (const entry of entries) {
    if (!entry.config || !entry.dir || !existsSync(entry.dir)) continue
    const { serverName } = entry.config
    const configPath = path.join(entry.dir, entry.configFile)
    try {
      await writeJsonConfig(configPath, json => entry.update(json, serverName, mcpUrl))
    }
    catch (err) {
      console.warn(`[vite-vue-mcp-inspect] Failed to update ${entry.label}: ${err}`)
    }
  }

  // Claude Desktop — opt-in, global config
  if (claudeDesktop) {
    const configPath = claudeDesktop.configPath || getClaudeDesktopConfigPath()
    if (configPath) {
      try {
        await writeJsonConfig(configPath, (json) => {
          json.mcpServers ??= {}
          json.mcpServers[claudeDesktop.serverName] = { type: 'streamablehttp', url: mcpUrl }
        })
      }
      catch (err) {
        console.warn(`[vite-vue-mcp-inspect] Failed to update Claude Desktop config: ${err}`)
      }
    }
  }
}

function getClaudeDesktopConfigPath(): string | null {
  const platform = process.platform
  if (platform === 'darwin') {
    return path.join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  }
  if (platform === 'win32') {
    const appData = process.env.APPDATA
    if (appData) return path.join(appData, 'Claude', 'claude_desktop_config.json')
  }
  return null
}
