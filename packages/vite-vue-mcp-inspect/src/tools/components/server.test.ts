import { describe, expect, it } from 'vitest'
import { rawText, setup, setupHanging, text } from '../../__tests__/unit/helpers'

describe('get-component-tree', () => {
  it('returns JSON-encoded tree on success', async () => {
    const tree = [{ name: 'App', children: [{ name: 'Counter' }] }]
    const { client } = await setup({ tree })
    const result = await client.callTool({ name: 'get-component-tree', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(tree)
  })

  it('returns isError on timeout', async () => {
    const { client } = await setupHanging()
    const result = await client.callTool({ name: 'get-component-tree', arguments: {} })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toContain('timed out')
  })
})

describe('get-component-tree-detailed', () => {
  it('returns detailed tree', async () => {
    const detailedTree = [{ name: 'App', file: 'App.vue', state: {} }]
    const { client } = await setup({ detailedTree })
    const result = await client.callTool({ name: 'get-component-tree-detailed', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(detailedTree)
  })
})

describe('get-component-state', () => {
  it('returns state object', async () => {
    const state = { props: { msg: 'hello' }, data: { count: 0 } }
    const { client } = await setup({ state })
    const result = await client.callTool({ name: 'get-component-state', arguments: { componentName: 'Counter' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(state)
  })

  it('returns error when browser sends { error }', async () => {
    const { client } = await setup({ state: { error: 'Component not found' } })
    const result = await client.callTool({ name: 'get-component-state', arguments: { componentName: 'Missing' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Component not found')
  })
})

describe('edit-component-state', () => {
  const args = {
    componentName: 'Counter',
    path: ['count'],
    value: '42',
    valueType: 'number' as const,
  }

  it('returns success', async () => {
    const { client } = await setup({ edit: { success: true } })
    const result = await client.callTool({ name: 'edit-component-state', arguments: args })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ edit: { success: false, error: 'Read-only' } })
    const result = await client.callTool({ name: 'edit-component-state', arguments: args })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Read-only')
  })
})

describe('highlight-component', () => {
  it('returns success', async () => {
    const { client } = await setup({ highlight: { success: true } })
    const result = await client.callTool({ name: 'highlight-component', arguments: { componentName: 'App' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ highlight: { success: false, error: 'Not found' } })
    const result = await client.callTool({ name: 'highlight-component', arguments: { componentName: 'X' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Not found')
  })
})

describe('scroll-to-component', () => {
  it('returns success', async () => {
    const { client } = await setup({ scroll: { success: true } })
    const result = await client.callTool({ name: 'scroll-to-component', arguments: { componentName: 'App' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ scroll: { success: false, error: 'Not visible' } })
    const result = await client.callTool({ name: 'scroll-to-component', arguments: { componentName: 'X' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('Not visible')
  })
})

describe('get-component-by-file', () => {
  it('returns component data', async () => {
    const componentByFile = { name: 'Counter', state: { count: 0 } }
    const { client } = await setup({ componentByFile })
    const result = await client.callTool({ name: 'get-component-by-file', arguments: { filePath: 'Counter.vue' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(componentByFile)
  })

  it('returns error when { error }', async () => {
    const { client } = await setup({ componentByFile: { error: 'File not found' } })
    const result = await client.callTool({ name: 'get-component-by-file', arguments: { filePath: 'Missing.vue' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('File not found')
  })
})
