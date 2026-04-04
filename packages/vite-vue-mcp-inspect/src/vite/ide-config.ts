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

  // Cursor
  if (cursor) {
    const cursorDir = path.join(root, '.cursor')
    if (existsSync(cursorDir)) {
      const configPath = path.join(cursorDir, 'mcp.json')
      try {
        await writeJsonConfig(configPath, (json) => {
          json.mcpServers ??= {}
          json.mcpServers[cursor.serverName] = { url: mcpUrl }
        })
      }
      catch (err) {
        console.warn(`[vue-mcp] Failed to update .cursor/mcp.json: ${err}`)
      }
    }
  }

  // Windsurf
  if (windsurf) {
    const windsurfDir = path.join(root, '.windsurf')
    if (existsSync(windsurfDir)) {
      const configPath = path.join(windsurfDir, 'mcp.json')
      try {
        await writeJsonConfig(configPath, (json) => {
          json.mcpServers ??= {}
          json.mcpServers[windsurf.serverName] = { serverUrl: mcpUrl }
        })
      }
      catch (err) {
        console.warn(`[vue-mcp] Failed to update .windsurf/mcp.json: ${err}`)
      }
    }
  }

  // VS Code
  if (vscode) {
    const vscodeDir = path.join(root, '.vscode')
    if (existsSync(vscodeDir)) {
      const configPath = path.join(vscodeDir, 'mcp.json')
      try {
        await writeJsonConfig(configPath, (json) => {
          json.servers ??= {}
          json.servers[vscode.serverName] = {
            type: 'http',
            url: mcpUrl,
          }
        })
      }
      catch (err) {
        console.warn(`[vue-mcp] Failed to update .vscode/mcp.json: ${err}`)
      }
    }
  }

  // Claude Desktop — opt-in
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
        console.warn(`[vue-mcp] Failed to update Claude Desktop config: ${err}`)
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
