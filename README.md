# vite-vue-mcp-inspect

Vite plugin that turns a running Vue app into an [MCP](https://modelcontextprotocol.io) server, giving AI assistants real-time access to your component tree, Pinia stores, router state, and more.

## Install

```bash
pnpm add -D vite-vue-mcp-inspect
```

## Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import VueMcp from 'vite-vue-mcp-inspect'

export default defineConfig({
  plugins: [VueMcp()],
})
```

The plugin starts an HTTP MCP server at `/__mcp/mcp` alongside your dev server and prints the URL to the console on start.

## Tools

| Tool | Description |
| ---- | ----------- |
| `get-component-tree` | Compact component hierarchy |
| `get-component-tree-detailed` | Full tree with component names, source files, and state |
| `get-component-state` | Props, data, computed, and setup state of a component |
| `edit-component-state` | Mutate component state directly in the browser |
| `highlight-component` | Visually highlight a component for 5 seconds |
| `scroll-to-component` | Scroll the viewport to a component |
| `get-router-info` | All registered routes and the current active route |
| `navigate-to-route` | Programmatic navigation |
| `get-pinia-tree` | List all registered Pinia stores |
| `get-pinia-state` | Full state snapshot of a specific store |
| `edit-pinia-state` | Mutate store state |
| `get-app-info` | Vue version, registered plugins, router status |
| `get-component-by-file` | Find a component by source file path |
| `reload-app` | Trigger a full page reload |

## Options

```ts
VueMcp({
  host: 'localhost',        // hostname used when printing the MCP URL
  mcpPath: '/__mcp',       // route prefix for MCP HTTP endpoints
  browserTimeout: 10_000,  // ms before browser-dependent tools time out
  printUrl: true,          // print MCP URL to console on startup

  // Auto-write the MCP URL into IDE config files
  updateCursorMcpJson: true,
  updateWindsurfMcpJson: true,
  updateVscodeMcpJson: true,
  updateClaudeDesktopConfig: false, // opt-in — writes to the global config

  // Replace the built-in MCP server entirely
  mcpServer: async (vite, ctx) => { /* return McpServer */ },

  // Add extra tools without replacing defaults
  mcpServerSetup: async (server, vite) => { /* server.tool(...) */ },
})
```

### Full options reference

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `host` | `string` | `'localhost'` | Hostname used when printing the MCP URL |
| `mcpPath` | `string` | `'/__mcp'` | Route prefix for MCP HTTP endpoints |
| `browserTimeout` | `number` | `10000` | Timeout (ms) for browser-side tool calls |
| `printUrl` | `boolean` | `true` | Print MCP URL to console on start |
| `appendTo` | `string \| RegExp` | — | Inject client into a specific module instead of HTML |
| `updateCursorMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.cursor/mcp.json` |
| `updateWindsurfMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.windsurf/mcp.json` |
| `updateVscodeMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.vscode/mcp.json` |
| `updateClaudeDesktopConfig` | `boolean \| ClaudeDesktopConfig` | `false` | Auto-update Claude Desktop config |
| `mcpServer` | `(vite, ctx) => McpServer` | — | Replace the built-in MCP server entirely |
| `mcpServerSetup` | `(server, vite) => void \| McpServer` | — | Add tools to the built-in MCP server |

## IDE Integration

The plugin writes the MCP URL to IDE config files automatically when it detects the corresponding directory in the project root.

| IDE | Config file | Default |
| --- | ----------- | ------- |
| Cursor | `.cursor/mcp.json` | enabled |
| Windsurf | `.windsurf/mcp.json` | enabled |
| VS Code | `.vscode/mcp.json` | enabled |
| Claude Desktop | platform config | disabled |

To customize the server name written to the config:

```ts
VueMcp({
  updateVscodeMcpJson: { serverName: 'my-app-mcp' },
})
```

## License

MIT
