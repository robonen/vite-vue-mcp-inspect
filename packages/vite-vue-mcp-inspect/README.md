# vite-vue-mcp-inspect

> A Vite plugin that exposes your running Vue app as an [MCP](https://modelcontextprotocol.io) server — so AI assistants can inspect and mutate your app state in real time.

Give your AI coding assistant runtime superpowers during development: read component trees, peek at Pinia stores, navigate routes, change i18n locales, and more — all without leaving the chat.

## Install

```bash
pnpm add -D vite-vue-mcp-inspect
# or
npm install -D vite-vue-mcp-inspect
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

Start your dev server. The MCP endpoint will be live at:

```
http://localhost:5173/__mcp/mcp
```

The plugin also auto-writes MCP config entries for Cursor, Windsurf, and VS Code when their config directories are detected — no manual wiring needed.

## What your AI can do

| Tool | Description |
| ---- | ----------- |
| `get-component-tree` | Compact component hierarchy |
| `get-component-tree-detailed` | Full tree with names, file paths, and state |
| `get-component-state` | Props, data, computed, and setup state |
| `edit-component-state` | Mutate component state in the browser at runtime |
| `highlight-component` | Highlight a component in the viewport |
| `scroll-to-component` | Scroll to a specific component |
| `get-component-by-file` | Find a component instance by source file path |
| `get-reactivity-relationships` | Dependency graph for component setup state |
| `get-router-info` | Registered routes and current route |
| `navigate-to-route` | Navigate with Vue Router |
| `get-pinia-tree` | List all registered Pinia stores |
| `get-pinia-state` | Read full state for a store |
| `edit-pinia-state` | Mutate Pinia store state |
| `get-provide-inject-tree` | Map all provide/inject relationships |
| `get-i18n-info` | vue-i18n status: locale, available locales, message key counts |
| `set-i18n-locale` | Change the active locale at runtime |
| `get-app-info` | Vue version, plugins, router status |
| `reload-app` | Trigger a full page reload |

## IDE Integration

The plugin auto-configures MCP entries when it detects the following config directories in your project root:

| IDE | Config file | Auto-enabled |
| --- | ----------- | ------------ |
| Cursor | `.cursor/mcp.json` | yes |
| Windsurf | `.windsurf/mcp.json` | yes |
| VS Code | `.vscode/mcp.json` | yes |
| Claude Desktop | platform config | no |

To opt out of a specific IDE or change the server name:

```ts
VueMcp({
  updateVscodeMcpJson: false,
  updateCursorMcpJson: { serverName: 'my-app' },
  updateClaudeDesktopConfig: true, // opt in
})
```

## Configuration

```ts
VueMcp({
  host: 'localhost',         // hostname used in the printed MCP URL
  mcpPath: '/__mcp',        // route prefix for MCP HTTP endpoints
  browserTimeout: 10_000,   // ms to wait for browser-side tool responses
  printUrl: true,           // print MCP URL on dev server start
  appendTo: undefined,      // inject client into a specific module instead of index.html

  updateCursorMcpJson: true,
  updateWindsurfMcpJson: true,
  updateVscodeMcpJson: true,
  updateClaudeDesktopConfig: false,

  // replace built-in MCP server entirely
  mcpServer: async (vite, ctx) => { /* return McpServer */ },

  // add custom tools on top of built-in ones
  mcpServerSetup: async (server, vite) => { /* add tools to server */ },
})
```

### Options reference

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `host` | `string` | `'localhost'` | Hostname used when printing the MCP URL |
| `mcpPath` | `string` | `'/__mcp'` | Route prefix for MCP HTTP endpoints |
| `browserTimeout` | `number` | `10000` | Timeout in ms for browser-side tool calls |
| `printUrl` | `boolean` | `true` | Print MCP URL on dev server start |
| `appendTo` | `string \| RegExp` | — | Inject runtime client into a specific module |
| `updateCursorMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.cursor/mcp.json` |
| `updateWindsurfMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.windsurf/mcp.json` |
| `updateVscodeMcpJson` | `boolean \| IdeMcpConfig` | `true` | Auto-update `.vscode/mcp.json` |
| `updateClaudeDesktopConfig` | `boolean \| ClaudeDesktopConfig` | `false` | Auto-update Claude Desktop config |
| `mcpServerInfo` | `{ name: string; version: string }` | — | Override MCP server name and version |
| `mcpServer` | `(vite, ctx) => McpServer` | — | Replace built-in MCP server entirely |
| `mcpServerSetup` | `(server, vite) => void \| McpServer` | — | Extend built-in server with extra tools |

## HTTPS support

When Vite runs with `server.https`, the printed MCP URL automatically uses `https://`:

```ts
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

## Multi-tab behaviour

When multiple browser tabs are open, MCP requests are routed to the **most recently connected tab**. If that tab is closed, the next request falls back to a broadcast and the first responding tab takes over.

## Contributing

```bash
pnpm install
pnpm play           # start playground + MCP endpoint at http://localhost:5173/__mcp/mcp
pnpm dev            # watch-build the plugin package
pnpm build          # production build
pnpm test           # run all tests
pnpm test:unit      # unit tests only
pnpm test:browser   # browser integration tests (requires running playground)
pnpm typecheck      # TypeScript checks
pnpm lint           # oxlint
```

## License

MIT
