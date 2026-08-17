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
      const locale = unwrap<string>(g.locale) ?? null
      const availableLocales: string[] = g.availableLocales ?? []
      const fallbackLocale = unwrap<string>(g.fallbackLocale) ?? null
      const messages = unwrap<Record<string, object>>(g.messages) ?? {}
      const messageStats: Record<string, number> = {}
      for (const loc in messages) {
        if (Object.prototype.hasOwnProperty.call(messages, loc)) {
          messageStats[loc] = countKeys(messages[loc]!)
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

/**
 * The subset of a vue-i18n instance this plugin reads. Every field may be a
 * plain value or a ref depending on legacy vs composition mode, hence `unknown`
 * plus {@link isRef} narrowing at each use.
 */
interface I18nGlobal {
  locale: unknown
  availableLocales?: string[]
  fallbackLocale?: unknown
  messages?: unknown
}

interface I18nInstance extends I18nGlobal {
  global?: I18nGlobal
}

function getI18nInstance(): I18nInstance | null {
  const globalProperties = activeAppRecord.value?.app?.config?.globalProperties as
    | Record<string, unknown>
    | undefined
  return (globalProperties?.$i18n as I18nInstance | undefined) ?? null
}

function isRef(v: unknown): v is { value: unknown } {
  return v !== null && typeof v === 'object' && '__v_isRef' in v
}

/** Read a vue-i18n field that may be a ref (composition mode) or a plain value. */
function unwrap<T>(v: unknown): T | undefined {
  return (isRef(v) ? v.value : v) as T | undefined
}

// for...in + accumulator instead of Object.values().reduce() —
// avoids allocating an intermediate array on each recursive call
function countKeys(obj: object, depth = 0): number {
  if (depth > 5 || typeof obj !== 'object' || obj === null) return 1
  let count = 0
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      count += countKeys((obj as Record<string, object>)[key]!, depth + 1)
    }
  }
  return count
}
