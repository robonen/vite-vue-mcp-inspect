import { describe, expect, it } from 'vitest'
import { rawText, setup, text } from '../../__tests__/unit/helpers'

describe('get-reactivity-relationships', () => {
  it('returns graph data', async () => {
    const reactivityRelationships = {
      graphNodes: [{ id: 'ref:count', type: 'ref' }],
      relationships: [{ source: 'ref:count', target: 'computed:doubled' }],
    }
    const { client } = await setup({ reactivityRelationships })
    const result = await client.callTool({ name: 'get-reactivity-relationships', arguments: { componentName: 'Counter' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(reactivityRelationships)
  })

  it('returns error when { error }', async () => {
    const { client } = await setup({ reactivityRelationships: { error: 'Component "Missing" not found' } })
    const result = await client.callTool({ name: 'get-reactivity-relationships', arguments: { componentName: 'Missing' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Component "Missing" not found')
  })
})
