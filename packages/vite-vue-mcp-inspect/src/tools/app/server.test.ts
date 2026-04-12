import { describe, expect, it } from 'vitest'
import { setup, setupHanging, text } from '../../__tests__/unit/helpers'

describe('get-app-info', () => {
  it('returns app info', async () => {
    const appInfo = { vueVersion: '3.5.0', plugins: ['router', 'pinia'] }
    const { client } = await setup({ appInfo })
    const result = await client.callTool({ name: 'get-app-info', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(appInfo)
  })
})

describe('reload-app', () => {
  it('returns success when acked', async () => {
    const { client } = await setup()
    const result = await client.callTool({ name: 'reload-app', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })

  it('returns success on timeout — page reloaded before ack', async () => {
    const { client } = await setupHanging()
    const result = await client.callTool({ name: 'reload-app', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true })
  })
})
