import { afterAll, beforeAll } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const MCP_URL = process.env.MCP_URL || 'http://localhost:5173/__mcp/mcp'

interface TextContent { type: string; text: string }

export function parseResult(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  return JSON.parse(((result.content as TextContent[])[0]!.text))
}

/**
 * Creates and connects an MCP client for the test file.
 * Registers beforeAll/afterAll to manage the connection lifecycle.
 * Returns a getter so test bodies always see the connected client.
 */
export function useTestClient() {
  let client: Client

  beforeAll(async () => {
    client = new Client({ name: 'vitest-browser', version: '0.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)))
  })

  afterAll(async () => {
    await client?.close()
  })

  return {
    get client(): Client { return client },
  }
}
