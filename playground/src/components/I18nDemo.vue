<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { themeKey, appVersionKey, analyticsKey } from '../injection-keys'

const { t, locale, availableLocales } = useI18n()

// Inject via Symbol keys — типобезопасный inject
const theme = inject(themeKey, ref<'light' | 'dark'>('light'))
const appVersion = inject(appVersionKey, 'unknown')
const analytics = inject(analyticsKey)
</script>

<template>
  <div>
    <h2>i18n Demo</h2>

    <div style="padding: 1rem; background: #f5f5f5; border-radius: 6px; margin-bottom: 1.5rem;">
      <p style="font-size: 1.2rem; font-weight: bold;">{{ t('greeting') }}</p>
      <p>{{ t('description') }}</p>
      <p style="font-size: 0.85rem; color: #555;">
        {{ t('currentLocale') }}: <strong>{{ locale }}</strong>
      </p>
    </div>

    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
      <button
        v-for="loc in availableLocales"
        :key="loc"
        :style="{ fontWeight: locale === loc ? 'bold' : 'normal' }"
        @click="locale = loc"
      >
        {{ loc }}
      </button>
    </div>

    <div style="font-size: 0.8rem; color: #888;">
        injected theme: {{ theme }} · appVersion: {{ appVersion }}
      <button style="margin-left: 0.5rem; font-size: 0.75rem;" @click="analytics?.track('demo-click')">track event</button>
    </div>
  </div>
</template>
