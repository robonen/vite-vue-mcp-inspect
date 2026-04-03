import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const MCP_URL = process.env.MCP_URL || 'http://localhost:5173/__mcp/mcp'

let client: Client

beforeAll(async () => {
  client = new Client({ name: 'vitest-browser', version: '0.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)))
})

afterAll(async () => {
  await client.close()
})

describe('MCP tools (browser integration)', () => {
  it('lists all 15 tools', async () => {
    const { tools } = await client.listTools()
    expect(tools).toHaveLength(15)
  })

  it('get-component-tree returns real Vue tree', async () => {
    const result = await client.callTool({ name: 'get-component-tree', arguments: {} })
    expect(result.isError).toBeFalsy()
    const tree = JSON.parse((result.content as any)[0].text)
    // Tree may be an object (single root) or array depending on the app
    expect(tree).toBeTruthy()
  })

  it('get-router-info returns current route and routes', async () => {
    const result = await client.callTool({ name: 'get-router-info', arguments: {} })
    const info = JSON.parse((result.content as any)[0].text)
    expect(info).toHaveProperty('currentRoute')
    expect(info).toHaveProperty('routes')
  })

  it('get-pinia-tree returns store list', async () => {
    const result = await client.callTool({ name: 'get-pinia-tree', arguments: {} })
    const stores = JSON.parse((result.content as any)[0].text)
    expect(Array.isArray(stores)).toBeTruthy()
  })

  it('get-app-info returns Vue version', async () => {
    const result = await client.callTool({ name: 'get-app-info', arguments: {} })
    const info = JSON.parse((result.content as any)[0].text)
    expect(info).toHaveProperty('vueVersion')
  })

  it('get-component-by-file finds Counter.vue', async () => {
    const result = await client.callTool({ name: 'get-component-by-file', arguments: { filePath: 'Counter.vue' } })
    expect(result.isError).toBeFalsy()
  })
})
