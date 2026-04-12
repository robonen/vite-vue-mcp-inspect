import { describe, expect, it } from 'vitest'
import { setup } from './helpers'

describe('tool registration', () => {
  it('registers exactly 18 tools', async () => {
    const { client } = await setup()
    const { tools } = await client.listTools()
    expect(tools).toHaveLength(18)
  })
})
