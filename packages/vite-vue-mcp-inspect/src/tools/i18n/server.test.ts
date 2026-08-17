import { describe, expect, it } from 'vitest'
import { rawText, setup, setupHanging, text } from '../../__tests__/unit/helpers'

describe('get-i18n-info', () => {
  it('returns i18n data when vue-i18n is installed', async () => {
    const i18nInfo = {
      detected: true,
      locale: 'en',
      availableLocales: ['en', 'ru'],
      fallbackLocale: 'en',
      messageStats: { en: 42, ru: 38 },
      error: null,
    }
    const { client } = await setup({ i18nInfo })
    const result = await client.callTool({ name: 'get-i18n-info', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toEqual(i18nInfo)
  })

  it('returns detected:false when vue-i18n is not installed', async () => {
    const i18nInfo = {
      detected: false,
      locale: null,
      availableLocales: [],
      fallbackLocale: null,
      messageStats: {},
      error: 'vue-i18n not detected. Make sure vue-i18n is installed and app.use(i18n) is called.',
    }
    const { client } = await setup({ i18nInfo })
    const result = await client.callTool({ name: 'get-i18n-info', arguments: {} })
    expect(result.isError).toBeFalsy()
    const data = text(result) as typeof i18nInfo
    expect(data.detected).toBeFalsy()
    expect(data.error).toBeTruthy()
  })

  it('returns isError on timeout', async () => {
    const { client } = await setupHanging()
    const result = await client.callTool({ name: 'get-i18n-info', arguments: {} })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toContain('timed out')
  })
})

describe('set-i18n-locale', () => {
  it('returns success with switched locale', async () => {
    const { client } = await setup({ setI18nLocale: { success: true } })
    const result = await client.callTool({ name: 'set-i18n-locale', arguments: { locale: 'ru' } })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toMatchObject({ success: true, locale: 'ru' })
  })

  it('returns error when success: false', async () => {
    const { client } = await setup({ setI18nLocale: { success: false, error: 'vue-i18n not detected.' } })
    const result = await client.callTool({ name: 'set-i18n-locale', arguments: { locale: 'de' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toBe('vue-i18n not detected.')
  })

  it('returns isError on timeout', async () => {
    const { client } = await setupHanging()
    const result = await client.callTool({ name: 'set-i18n-locale', arguments: { locale: 'fr' } })
    expect(result.isError).toBeTruthy()
    expect(rawText(result)).toContain('timed out')
  })
})
