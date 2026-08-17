import { describe, expect, it } from 'vitest'
import { parseResult, useTestClient } from '../../__tests__/browser/helpers'

const ctx = useTestClient()

describe('get-i18n-info', () => {
  it('returns detected field', async () => {
    const result = await ctx.client.callTool({ name: 'get-i18n-info', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = parseResult(result) as any
    expect(data).toHaveProperty('detected')
  })
})
