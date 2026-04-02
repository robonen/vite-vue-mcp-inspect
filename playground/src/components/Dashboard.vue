<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useStats } from '../composables/useStats'
import { useCounterStore } from '../stores/counter'

const theme = useTheme()
const stats = useStats()
const counter = useCounterStore()

// Local reactive state
const notificationCount = ref(0)
const lastAction = ref('none')

// Computed that depends on store + composable state
const statusLine = computed(() =>
  `Counter: ${counter.count} | ${stats.summary} | Theme: ${theme.themeLabel}`,
)

// Computed chain: depends on another computed that depends on a ref
const isHighActivity = computed(() => stats.peak > 5)
const alertLevel = computed(() => {
  if (!isHighActivity.value) return 'normal'
  if (counter.count > 10) return 'critical'
  return 'warning'
})

// Watch that crosses composable boundaries
watch(
  () => counter.count,
  (val) => {
    stats.record(val)
    lastAction.value = `counter changed to ${val}`
    notificationCount.value++
  },
)

watch(
  () => theme.darkMode,
  () => {
    lastAction.value = `theme toggled to ${theme.darkMode ? 'dark' : 'light'}`
    notificationCount.value++
  },
)

function incrementAndTrack() {
  counter.increment()
}

function toggleDark() {
  theme.darkMode = !theme.darkMode
}

function bumpMultiplier() {
  stats.multiplier++
}
</script>

<template>
  <div :style="theme.cssVars">
    <h2>Dashboard</h2>

    <section>
      <h3>Counter (from Pinia store)</h3>
      <p>Count: {{ counter.count }} | Double: {{ counter.doubleCount }}</p>
      <button @click="incrementAndTrack">Increment & Track</button>
      <button @click="counter.decrement()">Decrement</button>
    </section>

    <section>
      <h3>Stats (composable)</h3>
      <p>Total: {{ stats.adjustedTotal }} (×{{ stats.multiplier }})</p>
      <p>Average: {{ stats.average.toFixed(2) }} | Peak: {{ stats.peak }}</p>
      <p>Summary: {{ stats.summary }}</p>
      <button @click="bumpMultiplier">Bump Multiplier</button>
      <button @click="stats.reset()">Reset Stats</button>
    </section>

    <section>
      <h3>Theme (composable)</h3>
      <p>Mode: {{ theme.darkMode ? 'Dark' : 'Light' }} | Font: {{ theme.fontSize }}px</p>
      <p>Label: {{ theme.themeLabel }}</p>
      <button @click="toggleDark">Toggle Dark Mode</button>
      <button @click="theme.fontSize += 2">Increase Font</button>
    </section>

    <section>
      <h3>Dashboard Local State</h3>
      <p>Notifications: {{ notificationCount }}</p>
      <p>Last Action: {{ lastAction }}</p>
      <p>Status: {{ statusLine }}</p>
      <p>Alert Level: <strong>{{ alertLevel }}</strong></p>
    </section>
  </div>
</template>
