import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { ViteDevServer } from 'vite'

interface SessionEntry {
  server: McpServer
  transport: StreamableHTTPServerTransport
}

/** 1 MB — generous for JSON-RPC MCP messages. */
const MAX_BODY_SIZE = 1024 * 1024

/** Parse the raw body of an IncomingMessage as JSON. */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        req.destroy()
        reject(new Error('Request body too large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const data = Buffer.concat(chunks, size).toString('utf8')
        resolve(data ? JSON.parse(data) : undefined)
      }
      catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function sendJsonError(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: message }))
}

/**
 * Register Streamable HTTP transport on the Vite dev server at `{base}/mcp`.
 *
 * Returns a cleanup function to call when the server closes.
 */
export async function setupTransports(
  base: string,
  createServer: () => Promise<McpServer>,
  vite: ViteDevServer,
): Promise<() => Promise<void>> {
  const sessions = new Map<string, SessionEntry>()

  // ── Streamable HTTP transport ───────────────────────────────────────────

  vite.middlewares.use(`${base}/mcp`, async (req, res) => {
    const sRes = res as ServerResponse
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined

      if (req.method === 'POST') {
        let body: unknown
        try {
          body = await readJsonBody(req)
        }
        catch (e) {
          const message = e instanceof Error ? e.message : 'Invalid JSON body'
          const status = message === 'Request body too large' ? 413 : 400
          sendJsonError(sRes, status, message)
          return
        }

        if (!sessionId) {
          // New session — create transport + server
          const server = await createServer()
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => {
              sessions.set(id, { server, transport })
            },
          })
          let closing = false
          transport.onclose = () => {
            if (transport.sessionId) sessions.delete(transport.sessionId)
            if (!closing) {
              closing = true
              server.close().catch(() => {})
            }
          }
          await server.connect(transport)
          await transport.handleRequest(req, sRes, body)
          return
        }

        // Existing session
        const entry = sessions.get(sessionId)
        if (!entry) {
          sendJsonError(sRes, 404, `Session "${sessionId}" not found`)
          return
        }
        await entry.transport.handleRequest(req, sRes, body)
        return
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        if (!sessionId) {
          sendJsonError(sRes, 400, 'Missing mcp-session-id header')
          return
        }
        const entry = sessions.get(sessionId)
        if (!entry) {
          sendJsonError(sRes, 404, `Session "${sessionId}" not found`)
          return
        }
        await entry.transport.handleRequest(req, sRes)
        return
      }

      sendJsonError(sRes, 405, 'Method Not Allowed')
    }
    catch (err) {
      console.error('[vue-mcp] Streamable HTTP error:', err)
      if (!sRes.headersSent) {
        sendJsonError(sRes, 500, 'Internal server error')
      }
    }
  })

  // ── Cleanup ─────────────────────────────────────────────────────────────

  return async () => {
    await Promise.allSettled(
      [...sessions.values()].flatMap(e => [e.transport.close(), e.server.close()]),
    )
    sessions.clear()
  }
}
