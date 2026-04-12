import { describe, expect, it } from 'vitest'
import { useTestClient, parseResult } from '../../__tests__/browser/helpers'

const ctx = useTestClient()

describe('get-pinia-tree', () => {
  it('returns store list', async () => {
    const result = await ctx.client.callTool({ name: 'get-pinia-tree', arguments: {} })
    expect(Array.isArray(parseResult(result))).toBeTruthy()
  })
})
