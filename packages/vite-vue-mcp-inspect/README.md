# vite-vue-mcp-inspect

Vite plugin that turns a running Vue app into an [MCP](https://modelcontextprotocol.io) server.

Use it to inspect and mutate runtime Vue state from AI clients while developing.

## Install

```bash
pnpm add -D vite-vue-mcp-inspect
```

## Minimal Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import VueMcp from 'vite-vue-mcp-inspect'

export default defineConfig({
  plugins: [VueMcp()],
})
```

When Vite starts, the MCP endpoint is available at `/__mcp/mcp` by default.
The plugin automatically uses `https://` in the MCP URL when Vite is running with `server.https`.

Example with certificates:

```ts
// vite.config.ts
import fs from 'node:fs'
import { defineConfig } from 'vite'
import VueMcp from 'vite-vue-mcp-inspect'

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./certs/localhost-key.pem'),
      cert: fs.readFileSync('./certs/localhost.pem'),
    },
  },
  plugins: [VueMcp()],
})
```

## Built-in Tools

| Tool | Description |
| ---- | ----------- |
| `get-component-tree` | Compact component hierarchy |
| `get-component-tree-detailed` | Full tree with component names, files, and state |
| `get-component-state` | Props, data, computed, and setup state |
| `edit-component-state` | Mutate component state in browser runtime |
| `highlight-component` | Highlight a component in the viewport |
| `scroll-to-component` | Scroll to a specific component |
| `get-component-by-file` | Find component instance by source file path |
| `get-reactivity-relationships` | Build dependency graph for component setup state |
| `get-router-info` | Registered routes and current route |
| `navigate-to-route` | Navigate with Vue Router |
| `get-pinia-tree` | List registered Pinia stores |
| `get-pinia-state` | Read full state for one store |
| `edit-pinia-state` | Mutate Pinia state |
| `get-app-info` | Vue version, plugins, router status |
| `reload-app` | Trigger full page reload |
| `get-provide-inject-tree` | Map all provide/inject relationships — app-level provides and per-component provides with keys and values |
| `get-i18n-info` | vue-i18n status: current locale, available locales, fallback locale, message key counts |
| `set-i18n-locale` | Change the active locale in vue-i18n at runtime |

## Configuration

```ts
VueMcp({
  host: 'localhost',
  mcpPath: '/__mcp',
  browserTimeout: 10_000,
  printUrl: true,

  updateCursorMcpJson: true,
  updateWindsurfMcpJson: true,
  updateVscodeMcpJson: true,
  updateClaudeDesktopConfig: false,

  mcpServer: async (vite, ctx) => {
    // return your own McpServer to replace default tools
  },

  mcpServerSetup: async (server, vite) => {
    // add custom tools on top of built-in ones
  },
})
```

### Options Reference

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `host` | `string` | `'localhost'` | Hostname used when printing the MCP URL |
| `mcpPath` | `string` | `'/__mcp'` | Route prefix for MCP HTTP endpoints |
| `browserTimeout` | `number` | `10000` | Timeout in ms for browser-side tool calls |
| `printUrl` | `boolean` | `true` | Print MCP URL on dev server start |
| `appendTo` | `string \| RegExp` | - | Inject runtime client into specific module |
| `updateCursorMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.cursor/mcp.json` |
| `updateWindsurfMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.windsurf/mcp.json` |
| `updateVscodeMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.vscode/mcp.json` |
| `updateClaudeDesktopConfig` | `boolean \| ClaudeDesktopConfig` | `false` | Auto-update Claude Desktop config |
| `mcpServerInfo` | `{ name: string; version: string }` | - | Override MCP server name and version |
| `mcpServer` | `(vite, ctx) => McpServer` | - | Replace built-in MCP server entirely |
| `mcpServerSetup` | `(server, vite) => void \| McpServer` | - | Extend built-in MCP server with extra tools |

## IDE Integration

The plugin can auto-write MCP server entries when corresponding config directories exist.

| IDE | Config file | Default |
| --- | ----------- | ------- |
| Cursor | `.cursor/mcp.json` | enabled |
| Windsurf | `.windsurf/mcp.json` | enabled |
| VS Code | `.vscode/mcp.json` | enabled |
| Claude Desktop | platform config | disabled |

Server name override example:

```ts
VueMcp({
  updateVscodeMcpJson: { serverName: 'my-app-mcp' },
})
```

## Multi-tab behaviour

When multiple browser tabs are open, the plugin automatically targets the **most recently connected tab** for all MCP requests. If that tab is closed, the next request falls back to a broadcast and the first responding tab becomes the new target.

## License

MIT
