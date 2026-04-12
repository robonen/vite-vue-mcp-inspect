import type { InjectionKey, Ref } from 'vue'

export const themeKey = Symbol('theme') as InjectionKey<Ref<'light' | 'dark'>>
export const appVersionKey = Symbol('appVersion') as InjectionKey<string>
export const counterStepKey = Symbol('counterStep') as InjectionKey<Ref<number>>
export const analyticsKey = Symbol('analytics') as InjectionKey<{ track: (event: string) => void }>
