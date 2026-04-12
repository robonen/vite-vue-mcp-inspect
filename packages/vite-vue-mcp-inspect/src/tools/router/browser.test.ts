import { describe, expect, it } from 'vitest'
import { useTestClient, parseResult } from '../../__tests__/browser/helpers'

const ctx = useTestClient()

describe('get-router-info', () => {
  it('returns current route and routes', async () => {
    const result = await ctx.client.callTool({ name: 'get-router-info', arguments: {} })
    const info = parseResult(result) as any
    expect(info).toHaveProperty('currentRoute')
    expect(info).toHaveProperty('routes')
  })
})
