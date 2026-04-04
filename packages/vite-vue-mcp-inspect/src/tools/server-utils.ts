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
