import { describe, expect, it } from 'vitest'
import { parseResult, useTestClient } from '../../__tests__/browser/helpers'

const ctx = useTestClient()

describe('get-app-info', () => {
  it('returns Vue version', async () => {
    const result = await ctx.client.callTool({ name: 'get-app-info', arguments: {} })
    const info = parseResult(result) as any
    expect(info).toHaveProperty('vueVersion')
  })
})
