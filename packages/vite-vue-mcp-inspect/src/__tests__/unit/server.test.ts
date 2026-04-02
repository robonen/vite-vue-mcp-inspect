import { describe, expect, it } from 'vitest'
import { createHooks } from 'hookable'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer } from '../../server.js'
import type { VueMcpContext } from '../../types.js'

/**
 * Build a VueMcpContext whose rpcServer stubs immediately fire the hookable
 * event with the supplied data, simulating the browser round-trip.
 */
function makeCtx(responses: Partial<Record<string, unknown>> = {}): VueMcpContext {
  const ctx: VueMcpContext = { hooks: createHooks(), rpcServer: null as any }

  const respond = (key: string) =>
    ({ event }: { event: string }) => ctx.hooks.callHook(event, responses[key] ?? {})

  const respondResult = (key: string, fallback: unknown = { success: true }) =>
    ({ event }: { event: string }) => ctx.hooks.callHook(event, responses[key] ?? fallback)

  ctx.rpcServer = {
    getInspectorTree: respond('tree'),
    getDetailedComponentTree: respond('detailedTree'),
    getInspectorState: respond('state'),
    editComponentState: respondResult('edit'),
    highlightComponent: respondResult('highlight'),
    scrollToComponent: respondResult('scroll'),
    getRouterInfo: respond('router'),
    getPiniaTree: respond('piniaTree'),
    getPiniaState: respond('piniaState'),
    editPiniaState: respondResult('piniaEdit'),
    navigateToRoute: respondResult('navigate'),
    getAppInfo: respond('appInfo'),
    reloadApp: ({ event }: { event: string }) => ctx.hooks.callHook(event, null),
    getComponentByFile: respond('componentByFile'),
    getReactivityRelationships: respond('reactivityRelationships'),
  } as any

  return ctx
}

/** Connect a real MCP client ↔ server via InMemoryTransport. */
async function setup(responses: Partial<Record<string, unknown>> = {}, timeout = 5000) {
  const ctx = makeCtx(responses)
  const server = createMcpServer({}, ctx, timeout)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientTransport)
  return { client, ctx }
}

interface TextContent { type: string; text: string }

function text(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  const [entry] = result.content as TextContent[]
  return JSON.parse(entry!.text)
}

function rawText(result: Awaited<ReturnType<Client['callTool']>>): string {
  const [entry] = result.content as TextContent[]
  return entry!.text
}

// ────────────────────────────────────────────────────────────────────────────

describe('tool registration', () => {
  it('registers exactly 15 tools', async () => {
    const { client } = await setup()
    const { tools } = await client.listTools()
    expect(tools).toHaveLength(15)
  })
})

// ── 1. get-component-tree ──────────────────────────────────────────────────

describe('get-component-tree', () => {
  it('returns JSON-encoded tree on success', async () => {
    const tree = [{ name: 'App', children: [{ name: 'Counter' }] }]
    const { client } = await setup({ tree })
    const result = await client.callTool({ name: 'get-component-tree', arguments: {} })
    expect(text(result)).toEqual(tree)
    expect(result.isError).toBeFalsy()
  })

  it('returns isError on timeout', async () => {
    const ctx: VueMcpContext = { hooks: createHooks(), rpcServer: null as any }
    // rpcServer methods do nothing → hook never fires → timeout
    ctx.rpcServer = {
      getInspectorTree: () => {},
      getDetailedComponentTree: () => {},
      getInspectorState: () => {},
      editComponentState: () => {},
      highlightComponent: () => {},
      scrollToComponent: () => {},
      getRouterInfo: () => {},
      getPiniaTree: () => {},
      getPiniaState: () => {},
      editPiniaState: () => {},
      navigateToRoute: () => {},
      getAppInfo: () => {},
      reloadApp: () => {},
      getComponentByFile: () => {},
      getReactivityRelationships: () => {},
    } as any

    const server = createMcpServer({}, ctx, 50)
    const [ct, st] = InMemoryTransport.createLinkedPair()
    await server.connect(st)
    const client = new Client({ name: 'test', version: '0.0.0' })
    await client.connect(ct)

    const result = await client.callTool({ name: 'get-component-tree', arguments: {} })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toContain('timed out')
  })
})

// ── 2. get-component-tree-detailed ─────────────────────────────────────────

describe('get-component-tree-detailed', () => {
  it('returns detailed tree', async () => {
    const detailedTree = [{ name: 'App', file: 'App.vue', state: {} }]
    const { client } = await setup({ detailedTree })
    const result = await client.callTool({ name: 'get-component-tree-detailed', arguments: {} })
    expect(text(result)).toEqual(detailedTree)
    expect(result.isError).toBeFalsy()
  })
})

// ── 3. get-component-state ─────────────────────────────────────────────────

describe('get-component-state', () => {
  it('returns state object', async () => {
    const state = { props: { msg: 'hello' }, data: { count: 0 } }
    const { client } = await setup({ state })
    const result = await client.callTool({ name: 'get-component-state', arguments: { componentName: 'Counter' } })
    expect(text(result)).toEqual(state)
    expect(result.isError).toBeFalsy()
  })

  it('returns error when browser sends { error }', async () => {
    const { client } = await setup({ state: { error: 'Component not found' } })
    const result = await client.callTool({ name: 'get-component-state', arguments: { componentName: 'Missing' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Component not found')
  })
})

// ── 4. edit-component-state ────────────────────────────────────────────────

describe('edit-component-state', () => {
  const args = {
    componentName: 'Counter',
    path: ['count'],
    value: '42',
    valueType: 'number' as const,
  }

  it('returns success', async () => {
    const { client } = await setup({ edit: { success: true } })
    const result = await client.callTool({ name: 'edit-component-state', arguments: args })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ edit: { success: false, error: 'Read-only' } })
    const result = await client.callTool({ name: 'edit-component-state', arguments: args })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Read-only')
  })
})

// ── 5. highlight-component ─────────────────────────────────────────────────

describe('highlight-component', () => {
  it('returns success', async () => {
    const { client } = await setup({ highlight: { success: true } })
    const result = await client.callTool({ name: 'highlight-component', arguments: { componentName: 'App' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ highlight: { success: false, error: 'Not found' } })
    const result = await client.callTool({ name: 'highlight-component', arguments: { componentName: 'X' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Not found')
  })
})

// ── 6. scroll-to-component ─────────────────────────────────────────────────

describe('scroll-to-component', () => {
  it('returns success', async () => {
    const { client } = await setup({ scroll: { success: true } })
    const result = await client.callTool({ name: 'scroll-to-component', arguments: { componentName: 'App' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ scroll: { success: false, error: 'Not visible' } })
    const result = await client.callTool({ name: 'scroll-to-component', arguments: { componentName: 'X' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Not visible')
  })
})

// ── 7. get-router-info ─────────────────────────────────────────────────────

describe('get-router-info', () => {
  it('returns router data', async () => {
    const router = { currentRoute: '/', routes: ['/'] }
    const { client } = await setup({ router })
    const result = await client.callTool({ name: 'get-router-info', arguments: {} })
    expect(text(result)).toEqual(router)
    expect(result.isError).toBeFalsy()
  })
})

// ── 8. navigate-to-route ───────────────────────────────────────────────────

describe('navigate-to-route', () => {
  it('returns success with navigatedTo', async () => {
    const { client } = await setup({ navigate: { success: true } })
    const result = await client.callTool({ name: 'navigate-to-route', arguments: { path: '/about' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true, navigatedTo: '/about' })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ navigate: { success: false, error: 'No such route' } })
    const result = await client.callTool({ name: 'navigate-to-route', arguments: { path: '/nope' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('No such route')
  })
})

// ── 9. get-pinia-tree ──────────────────────────────────────────────────────

describe('get-pinia-tree', () => {
  it('returns store list', async () => {
    const piniaTree = [{ id: 'counter', label: 'counter' }]
    const { client } = await setup({ piniaTree })
    const result = await client.callTool({ name: 'get-pinia-tree', arguments: {} })
    expect(text(result)).toEqual(piniaTree)
    expect(result.isError).toBeFalsy()
  })
})

// ── 10. get-pinia-state ────────────────────────────────────────────────────

describe('get-pinia-state', () => {
  it('returns store state', async () => {
    const piniaState = { count: 0, doubled: 0 }
    const { client } = await setup({ piniaState })
    const result = await client.callTool({ name: 'get-pinia-state', arguments: { storeName: 'counter' } })
    expect(text(result)).toEqual(piniaState)
    expect(result.isError).toBeFalsy()
  })

  it('returns error when { error }', async () => {
    const { client } = await setup({ piniaState: { error: 'Store not found' } })
    const result = await client.callTool({ name: 'get-pinia-state', arguments: { storeName: 'missing' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Store not found')
  })
})

// ── 11. edit-pinia-state ───────────────────────────────────────────────────

describe('edit-pinia-state', () => {
  const args = {
    storeName: 'counter',
    path: ['count'],
    value: '10',
    valueType: 'number' as const,
  }

  it('returns success', async () => {
    const { client } = await setup({ piniaEdit: { success: true } })
    const result = await client.callTool({ name: 'edit-pinia-state', arguments: args })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ piniaEdit: { success: false, error: 'Immutable' } })
    const result = await client.callTool({ name: 'edit-pinia-state', arguments: args })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Immutable')
  })
})

// ── 12. get-app-info ───────────────────────────────────────────────────────

describe('get-app-info', () => {
  it('returns app info', async () => {
    const appInfo = { vueVersion: '3.5.0', plugins: ['router', 'pinia'] }
    const { client } = await setup({ appInfo })
    const result = await client.callTool({ name: 'get-app-info', arguments: {} })
    expect(text(result)).toEqual(appInfo)
    expect(result.isError).toBeFalsy()
  })
})

// ── 13. reload-app ─────────────────────────────────────────────────────────

describe('reload-app', () => {
  it('returns success when acked', async () => {
    const { client } = await setup()
    const result = await client.callTool({ name: 'reload-app', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns success (not error) on timeout — page reloaded before ack', async () => {
    // rpcServer.reloadApp does nothing → hook never fires → timeout
    // But reload-app treats timeout as success (page reloaded before ack)
    const ctx: VueMcpContext = { hooks: createHooks(), rpcServer: null as any }
    ctx.rpcServer = {
      getInspectorTree: () => {},
      getDetailedComponentTree: () => {},
      getInspectorState: () => {},
      editComponentState: () => {},
      highlightComponent: () => {},
      scrollToComponent: () => {},
      getRouterInfo: () => {},
      getPiniaTree: () => {},
      getPiniaState: () => {},
      editPiniaState: () => {},
      navigateToRoute: () => {},
      getAppInfo: () => {},
      reloadApp: () => {},
      getComponentByFile: () => {},
      getReactivityRelationships: () => {},
    } as any

    const server = createMcpServer({}, ctx, 50)
    const [ct, st] = InMemoryTransport.createLinkedPair()
    await server.connect(st)
    const client = new Client({ name: 'test', version: '0.0.0' })
    await client.connect(ct)

    const result = await client.callTool({ name: 'reload-app', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })
})

// ── 14. get-component-by-file ──────────────────────────────────────────────

describe('get-component-by-file', () => {
  it('returns component data', async () => {
    const componentByFile = { name: 'Counter', state: { count: 0 } }
    const { client } = await setup({ componentByFile })
    const result = await client.callTool({ name: 'get-component-by-file', arguments: { filePath: 'Counter.vue' } })
    expect(text(result)).toEqual(componentByFile)
    expect(result.isError).toBeFalsy()
  })

  it('returns error when { error }', async () => {
    const { client } = await setup({ componentByFile: { error: 'File not found' } })
    const result = await client.callTool({ name: 'get-component-by-file', arguments: { filePath: 'Missing.vue' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('File not found')
  })
})
