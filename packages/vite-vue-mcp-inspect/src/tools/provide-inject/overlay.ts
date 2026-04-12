import { activeAppRecord } from '@vue/devtools-kit'
import {
  fetchComponentTree,
  flattenChildren,
  mapConcurrent,
  stringify,
  withHighPerfDisabled,
} from '../overlay-utils.ts'

interface ProvideEntry {
  key: string
  keyType: 'string' | 'symbol'
  valueType: string
  value: unknown
}

export function createProvideInjectHandlers() {
  return {
    async getProvideInjectTree() {
      return withHighPerfDisabled(async () => {
        const appRecord = activeAppRecord.value
        const appCtxProvides = (appRecord?.app as any)?._context?.provides ?? {}
        const appProvides = serializeProvides(appCtxProvides)

        const root = await fetchComponentTree()
        const all = flattenChildren(root)
        const componentProviders: any[] = []

        await mapConcurrent(all, 10, async (node: any) => {
          const instance = appRecord?.instanceMap?.get(node.id)
          if (!instance) return
          const provides = (instance as any).provides
          if (!provides) return

          // Vue инициализирует provides как Object.create(parent.provides)
          // Собственные ключи = не унаследованы от прототипа
          const ownProvides = getOwnProvides(provides)
          if (ownProvides.length === 0) return

          componentProviders.push({
            componentName: node.name,
            file: node.file ?? null,
            provides: ownProvides,
          })
        })

        return { appProvides, componentProviders }
      })
    },
  }
}

// Reflect.ownKeys = string + symbol за один проход; нет промежуточных массивов
function serializeProvides(provides: object): ProvideEntry[] {
  const result: ProvideEntry[] = []
  for (const key of Reflect.ownKeys(provides)) {
    const isSymbol = typeof key === 'symbol'
    result.push({
      key: isSymbol ? (key as symbol).toString() : (key as string),
      keyType: isSymbol ? 'symbol' : 'string',
      valueType: typeof (provides as any)[key],
      value: safeSerialize((provides as any)[key]),
    })
  }
  return result
}

// Собственные provides компонента — только ключи, которых нет у прототипа
function getOwnProvides(provides: object): ProvideEntry[] {
  const parentProvides = Object.getPrototypeOf(provides) ?? {}
  const result: ProvideEntry[] = []
  for (const key of Reflect.ownKeys(provides)) {
    if (Object.prototype.hasOwnProperty.call(parentProvides, key)) continue
    const isSymbol = typeof key === 'symbol'
    result.push({
      key: isSymbol ? (key as symbol).toString() : (key as string),
      keyType: isSymbol ? 'symbol' : 'string',
      valueType: typeof (provides as any)[key],
      value: safeSerialize((provides as any)[key]),
    })
  }
  return result
}

function safeSerialize(value: unknown): unknown {
  if (value === null || value === undefined) return value
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  try { return JSON.parse(stringify(value) as string) }
  catch { return '[unserializable]' }
}
