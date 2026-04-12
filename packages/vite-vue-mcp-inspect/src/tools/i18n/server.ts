import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types.ts'
import { definePassthroughTool, defineSuccessCheckTool } from '../server-utils.ts'

export function registerI18nTools(deps: ToolRegistrationDeps): void {
  definePassthroughTool(deps, 'get-i18n-info', {
    description: 'Get vue-i18n information: current locale, available locales, fallback locale, and message key count per locale. Returns { detected: false } if vue-i18n is not installed.',
  }, c => c.getI18nInfo())

  defineSuccessCheckTool(deps, 'set-i18n-locale', {
    description: 'Change the active locale in vue-i18n at runtime.',
    inputSchema: {
      locale: z.string().describe('Locale code to switch to, e.g. "en", "ru", "de"'),
    },
  }, (c, { locale }) => c.setI18nLocale({ locale }), ({ locale }) => ({ success: true, locale }))
}
