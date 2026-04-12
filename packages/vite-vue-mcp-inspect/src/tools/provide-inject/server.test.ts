import { describe, expect, it } from 'vitest'
import { setup, setupHanging, text, rawText } from '../../__tests__/unit/helpers'

describe('get-provide-inject-tree', () => {
  it('returns app-level and component-level provides', async () => {
    const provideInjectTree = {
      appProvides: [
        { key: 'Symbol(vue-router)', keyType: 'symbol', valueType: 'object', value: '[unserializable]' },
      ],
      componentProviders: [
        {
          componentName: 'App',
          file: 'src/App.vue',
          provides: [{ key: 'theme', keyType: 'string', valueType: 'string', value: 'dark' }],
        },
      ],
    }
    const { client } = await setup({ provideInjectTree })
    const result = await client.callTool({ name: 'get-provide-inject-tree', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(provideInjectTree)
  })

  it('returns empty lists when nothing is provided', async () => {
    const { client } = await setup({ provideInjectTree: { appProvides: [], componentProviders: [] } })
    const result = await client.callTool({ name: 'get-provide-inject-tree', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual({ appProvides: [], componentProviders: [] })
  })

  it('returns isError on timeout', async () => {
    const { client } = await setupHanging()
    const result = await client.callTool({ name: 'get-provide-inject-tree', arguments: {} })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toContain('timed out')
  })
})
