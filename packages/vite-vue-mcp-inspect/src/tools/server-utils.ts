import type { BrowserClient, ToolRegistrationDeps } from './types.ts'

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

interface ToolMeta {
  description: string;
  inputSchema?: Record<string, unknown>
}

/**
 * Passthrough: result is forwarded as-is.
 */
export function definePassthroughTool(
  deps: ToolRegistrationDeps,
  name: string,
  meta: ToolMeta,
  call: (client: BrowserClient, args: any) => Promise<unknown>,
): void {
  deps.server.registerTool(name, meta as any, async (args: any) => {
    try {
      return ok(await deps.withTool(name, c => call(c, args)))
    }
    catch (e) {
      return err(errorMessage(e))
    }
  })
}

/**
 * ErrorCheck: result may be `{ error: string }` — treated as tool error.
 */
export function defineErrorCheckTool(
  deps: ToolRegistrationDeps,
  name: string,
  meta: ToolMeta,
  call: (client: BrowserClient, args: any) => Promise<unknown>,
): void {
  deps.server.registerTool(name, meta as any, async (args: any) => {
    try {
      const result = await deps.withTool(name, c => call(c, args))
      if (isErrorResult(result)) return err(result.error)
      return ok(result)
    }
    catch (e) {
      return err(errorMessage(e))
    }
  })
}

/**
 * SuccessCheck: result has `{ success: boolean; error?: string }` — non-success is tool error.
 * `onSuccess` transforms the result for the ok() response.
 */
export function defineSuccessCheckTool(
  deps: ToolRegistrationDeps,
  name: string,
  meta: ToolMeta,
  call: (client: BrowserClient, args: any) => Promise<{ success: boolean; error?: string }>,
  onSuccess: (args: any) => unknown,
): void {
  deps.server.registerTool(name, meta as any, async (args: any) => {
    try {
      const result = await deps.withTool(name, c => call(c, args))
      if (!result.success) return err(result.error ?? 'Unknown error')
      return ok(onSuccess(args))
    }
    catch (e) {
      return err(errorMessage(e))
    }
  })
}
