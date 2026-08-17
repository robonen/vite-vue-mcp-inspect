import { describe, expect, it } from 'vitest'
import { rawText, setup, text } from '../../__tests__/unit/helpers'

describe('get-router-info', () => {
  it('returns router data', async () => {
    const router = { currentRoute: '/', routes: ['/'] }
    const { client } = await setup({ router })
    const result = await client.callTool({ name: 'get-router-info', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(router)
  })
})

describe('navigate-to-route', () => {
  it('returns success with navigatedTo', async () => {
    const { client } = await setup({ navigate: { success: true } })
    const result = await client.callTool({ name: 'navigate-to-route', arguments: { path: '/about' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true, navigatedTo: '/about' })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ navigate: { success: false, error: 'No such route' } })
    const result = await client.callTool({ name: 'navigate-to-route', arguments: { path: '/nope' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('No such route')
  })
})
