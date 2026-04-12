import { describe, expect, it } from 'vitest'
import { useTestClient, parseResult } from '../../__tests__/browser/helpers'

const ctx = useTestClient()

describe('get-component-tree', () => {
  it('returns real Vue tree', async () => {
    const result = await ctx.client.callTool({ name: 'get-component-tree', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(parseResult(result)).toBeTruthy()
  })
})

describe('get-component-by-file', () => {
  it('finds Counter.vue', async () => {
    const result = await ctx.client.callTool({ name: 'get-component-by-file', arguments: { filePath: 'Counter.vue' } })
    expect(result.isError).toBeFalsy()
  })
})
