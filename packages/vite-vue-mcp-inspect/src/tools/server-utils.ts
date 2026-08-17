import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ShapeOutput, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import type { BrowserClient, ToolRegistrationDeps } from './types'

export interface ToolResult {
  [key: string]: unknown
  content: Array<{ type: 'text'; text: string }>
  isError: boolean
}

export function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }], isError: false }
}

export function err(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function isErrorResult(r: unknown): r is { error: string } {
  return r !== null && r !== undefined && typeof r === 'object' && 'error' in r
}

interface ToolMeta<S extends ZodRawShapeCompat> {
  description: string
  inputSchema?: S
}

/**
 * Arguments a tool handler receives, inferred from its zod input schema. Tools
 * declared without a schema take no arguments.
 */
type ToolArgs<S extends ZodRawShapeCompat> = ShapeOutput<S>

function defineTool<S extends ZodRawShapeCompat>(
  deps: ToolRegistrationDeps,
  name: string,
  meta: ToolMeta<S>,
  call: (client: BrowserClient, args: ToolArgs<S>) => Promise<unknown>,
  transform: (result: unknown, args: ToolArgs<S>) => ToolResult,
): void {
  const handler = async (args: ToolArgs<S>): Promise<ToolResult> => {
    try {
      return transform(await deps.withTool(name, c => call(c, args)), args)
    }
    catch (e) {
      return err(errorMessage(e))
    }
  }
  // `ToolCallback` is a conditional type over the schema; TypeScript defers it
  // while `S` is still an unresolved type parameter, so it can't verify the
  // handler here. Call sites remain fully typed via `ToolArgs<S>`.
  deps.server.registerTool(name, meta, handler as unknown as ToolCallback<S>)
}

/**
 * Passthrough: result is forwarded as-is.
 */
export function definePassthroughTool<S extends ZodRawShapeCompat>(
  deps: ToolRegistrationDeps,
  name: string,
  meta: ToolMeta<S>,
  call: (client: BrowserClient, args: ToolArgs<S>) => Promise<unknown>,
): void {
  defineTool(deps, name, meta, call, ok)
}

/**
 * ErrorCheck: result may be `{ error: string }` — treated as tool error.
 */
export function defineErrorCheckTool<S extends ZodRawShapeCompat>(
  deps: ToolRegistrationDeps,
  name: string,
  meta: ToolMeta<S>,
  call: (client: BrowserClient, args: ToolArgs<S>) => Promise<unknown>,
): void {
  defineTool(deps, name, meta, call, result =>
    isErrorResult(result) ? err(result.error) : ok(result),
  )
}

/**
 * SuccessCheck: result has `{ success: boolean; error?: string }` — non-success is tool error.
 * `onSuccess` transforms the result for the ok() response.
 */
export function defineSuccessCheckTool<S extends ZodRawShapeCompat>(
  deps: ToolRegistrationDeps,
  name: string,
  meta: ToolMeta<S>,
  call: (client: BrowserClient, args: ToolArgs<S>) => Promise<{ success: boolean; error?: string }>,
  onSuccess: (args: ToolArgs<S>) => unknown,
): void {
  defineTool(deps, name, meta, call, (result, args) => {
    const r = result as { success: boolean; error?: string }
    return r.success ? ok(onSuccess(args)) : err(r.error ?? 'Unknown error')
  })
}
