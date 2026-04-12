import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer } from '../../core/server'
import type { VueMcpContext } from '../../core/types'

type Responses = Partial<Record<string, unknown>>

// ── Context factories ──────────────────────────────────────────────────────

export function makeCtx(responses: Responses = {}): VueMcpContext {
  const reply = (key: string, fallback: unknown = {}) =>
    () => Promise.resolve(responses[key] ?? fallback)

  const replyWithArg = (key: string, fallback: unknown = {}) =>
    (_query: any) => Promise.resolve(responses[key] ?? fallback)

  const replyResult = (key: string, fallback: unknown = { success: true }) =>
    (_query?: any) => Promise.resolve(responses[key] ?? fallback)

  return {
    rpc: {
      getInspectorTree: reply('tree'),
      getDetailedComponentTree: reply('detailedTree'),
      getInspectorState: replyWithArg('state'),
      editComponentState: replyResult('edit'),
      highlightComponent: replyResult('highlight'),
      scrollToComponent: replyResult('scroll'),
      getRouterInfo: reply('router'),
      getPiniaTree: reply('piniaTree'),
      getPiniaState: replyWithArg('piniaState'),
      editPiniaState: replyResult('piniaEdit'),
      navigateToRoute: replyResult('navigate'),
      getAppInfo: reply('appInfo'),
      reloadApp: () => Promise.resolve(),
      getComponentByFile: replyWithArg('componentByFile'),
      getReactivityRelationships: replyWithArg('reactivityRelationships'),
      getProvideInjectTree: reply('provideInjectTree'),
      getI18nInfo: reply('i18nInfo'),
      setI18nLocale: replyResult('setI18nLocale'),
    } as any,
  }
}

export function makeHangingCtx(): VueMcpContext {
  const neverResolve = () => new Promise<never>(() => {})
  return {
    rpc: {
      getInspectorTree: neverResolve,
      getDetailedComponentTree: neverResolve,
      getInspectorState: neverResolve,
      editComponentState: neverResolve,
      highlightComponent: neverResolve,
      scrollToComponent: neverResolve,
      getRouterInfo: neverResolve,
      getPiniaTree: neverResolve,
      getPiniaState: neverResolve,
      editPiniaState: neverResolve,
      navigateToRoute: neverResolve,
      getAppInfo: neverResolve,
      reloadApp: neverResolve,
      getComponentByFile: neverResolve,
      getReactivityRelationships: neverResolve,
      getProvideInjectTree: neverResolve,
      getI18nInfo: neverResolve,
      setI18nLocale: neverResolve,
    } as any,
  }
}

// ── Client setup ───────────────────────────────────────────────────────────

export async function setup(responses: Responses = {}, timeout = 5000) {
  const ctx = makeCtx(responses)
  const server = createMcpServer({}, ctx, timeout)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientTransport)
  return { client, ctx }
}

export async function setupHanging(timeout = 50) {
  const ctx = makeHangingCtx()
  const server = createMcpServer({}, ctx, timeout)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientTransport)
  return { client }
}

// ── Result helpers ─────────────────────────────────────────────────────────

interface TextContent { type: string; text: string }

export function text(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  const [entry] = result.content as TextContent[]
  return JSON.parse(entry!.text)
}

export function rawText(result: Awaited<ReturnType<Client['callTool']>>): string {
  const [entry] = result.content as TextContent[]
  return entry!.text
}
