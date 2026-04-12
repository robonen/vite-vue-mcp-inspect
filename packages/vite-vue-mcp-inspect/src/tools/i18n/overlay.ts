import { activeAppRecord } from '@vue/devtools-kit'

// Unified response shape — one hidden class, no polymorphic IC at call sites
interface I18nInfo {
  detected: boolean
  locale: string | null
  availableLocales: string[]
  fallbackLocale: string | null
  messageStats: Record<string, number>
  error: string | null
}

export function createI18nHandlers() {
  return {
    async getI18nInfo(): Promise<I18nInfo> {
      const i18n = getI18nInstance()
      if (!i18n) {
        return {
          detected: false,
          locale: null,
          availableLocales: [],
          fallbackLocale: null,
          messageStats: {},
          error: 'vue-i18n not detected. Make sure vue-i18n is installed and app.use(i18n) is called.',
        }
      }
      const g = i18n.global ?? i18n
      const locale: string = isRef(g.locale) ? g.locale.value : g.locale
      const availableLocales: string[] = g.availableLocales ?? []
      const fallbackLocale: string | null = isRef(g.fallbackLocale) ? g.fallbackLocale.value : (g.fallbackLocale ?? null)
      const messages = isRef(g.messages) ? g.messages.value : (g.messages ?? {})
      const messageStats: Record<string, number> = {}
      for (const loc in messages) {
        if (Object.prototype.hasOwnProperty.call(messages, loc)) {
          messageStats[loc] = countKeys(messages[loc] as object)
        }
      }
      return { detected: true, locale, availableLocales, fallbackLocale, messageStats, error: null }
    },

    async setI18nLocale(query: { locale: string }) {
      const i18n = getI18nInstance()
      if (!i18n) {
        return { success: false as const, error: 'vue-i18n not detected.' }
      }
      const g = i18n.global ?? i18n
      if (isRef(g.locale)) {
        g.locale.value = query.locale
      }
      else {
        g.locale = query.locale
      }
      return { success: true as const }
    },
  }
}

function getI18nInstance(): any {
  return activeAppRecord.value?.app?.config?.globalProperties?.$i18n ?? null
}

function isRef(v: any): v is { value: any } {
  return v !== null && typeof v === 'object' && '__v_isRef' in v
}

// for...in + accumulator instead of Object.values().reduce() —
// avoids allocating an intermediate array on each recursive call
function countKeys(obj: object, depth = 0): number {
  if (depth > 5 || typeof obj !== 'object' || obj === null) return 1
  let count = 0
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      count += countKeys((obj as any)[key], depth + 1)
    }
  }
  return count
}
