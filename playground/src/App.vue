<script setup lang="ts">
import { provide, ref } from 'vue'
import { RouterView, RouterLink } from 'vue-router'
import { themeKey, appVersionKey } from './injection-keys'

// String key + Symbol key provides — оба варианта видны в get-provide-inject-tree
const theme = ref<'light' | 'dark'>('light')
provide('theme', theme)          // string key
provide(themeKey, theme)         // Symbol key (типизированный)
provide(appVersionKey, '1.0.0-playground')

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
  <div :data-theme="theme" style="max-width: 640px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif;">
    <h1>Vue MCP Playground</h1>
    <nav style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
      <RouterLink to="/">Counter</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/dashboard">Dashboard</RouterLink>
      <RouterLink to="/i18n">i18n Demo</RouterLink>
    </nav>
    <div style="margin-bottom: 1.5rem; font-size: 0.85rem; color: #666;">
      theme: <strong>{{ theme }}</strong>
      <button style="margin-left: 0.5rem;" @click="toggleTheme">toggle</button>
    </div>
    <RouterView />
  </div>
</template>
