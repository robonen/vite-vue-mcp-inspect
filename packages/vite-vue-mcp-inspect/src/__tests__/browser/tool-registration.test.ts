import { describe, expect, it } from 'vitest'
import { useTestClient } from './helpers'

const ctx = useTestClient()

describe('tool registration', () => {
  it('lists all 18 tools', async () => {
    const { tools } = await ctx.client.listTools()
    expect(tools).toHaveLength(18)
  })
})
