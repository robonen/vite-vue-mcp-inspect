import { describe, expect, it } from 'vitest'
import { setup, text, rawText } from '../../__tests__/unit/helpers'

describe('get-pinia-tree', () => {
  it('returns store list', async () => {
    const piniaTree = [{ id: 'counter', label: 'counter' }]
    const { client } = await setup({ piniaTree })
    const result = await client.callTool({ name: 'get-pinia-tree', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(piniaTree)
  })
})

describe('get-pinia-state', () => {
  it('returns store state', async () => {
    const piniaState = { count: 0, doubled: 0 }
    const { client } = await setup({ piniaState })
    const result = await client.callTool({ name: 'get-pinia-state', arguments: { storeName: 'counter' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(piniaState)
  })

  it('returns error when { error }', async () => {
    const { client } = await setup({ piniaState: { error: 'Store not found' } })
    const result = await client.callTool({ name: 'get-pinia-state', arguments: { storeName: 'missing' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Store not found')
  })
})

describe('edit-pinia-state', () => {
  const args = {
    storeName: 'counter',
    path: ['count'],
    value: '10',
    valueType: 'number' as const,
  }

  it('returns success', async () => {
    const { client } = await setup({ piniaEdit: { success: true } })
    const result = await client.callTool({ name: 'edit-pinia-state', arguments: args })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ piniaEdit: { success: false, error: 'Immutable' } })
    const result = await client.callTool({ name: 'edit-pinia-state', arguments: args })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Immutable')
  })
})
