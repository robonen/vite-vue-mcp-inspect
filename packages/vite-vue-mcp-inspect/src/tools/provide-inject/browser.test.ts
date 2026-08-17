import { describe, expect, it } from 'vitest'
import { parseResult, useTestClient } from '../../__tests__/browser/helpers'

const ctx = useTestClient()

describe('get-provide-inject-tree', () => {
  it('returns appProvides and componentProviders arrays', async () => {
    const result = await ctx.client.callTool({ name: 'get-provide-inject-tree', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseResult(result) as any
    expect(Array.isArray(data.appProvides)).toBeTruthy()
    expect(Array.isArray(data.componentProviders)).toBeTruthy()
  })
})
