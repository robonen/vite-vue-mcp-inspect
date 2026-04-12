# vue-mcp

Monorepo for `vite-vue-mcp-inspect`, a Vite plugin that exposes a running Vue app as an [MCP](https://modelcontextprotocol.io) server.

It gives AI assistants runtime access to component state, router state, Pinia stores, and reactivity relationships during development.

## Packages

- `packages/vite-vue-mcp-inspect`: Published plugin package.
- `playground`: Local app used to test tools end-to-end.

## Quick Start

```bash
pnpm install
pnpm play
```

This starts the playground and an MCP endpoint at `http://localhost:5173/__mcp/mcp`.

## Plugin Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import VueMcp from 'vite-vue-mcp-inspect'

export default defineConfig({
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

## Development Commands

```bash
pnpm build          # build package
pnpm dev            # watch package build
pnpm play           # run playground
pnpm test           # run all tests
pnpm test:unit      # run unit tests only
pnpm test:browser   # run browser integration tests (requires running playground)
pnpm lint           # run oxlint
pnpm typecheck      # run typescript checks
```

## License

MIT
