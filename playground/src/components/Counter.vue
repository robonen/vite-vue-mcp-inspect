<script setup lang="ts">
import { inject, provide, ref } from 'vue'
import { useCounterStore } from '../stores/counter'
import { themeKey, counterStepKey } from '../injection-keys'

const counter = useCounterStore()

// Inject via Symbol key — type-safe inject
const theme = inject(themeKey)

// Provide step via Symbol key — component-level Symbol provide
const step = ref(1)
provide(counterStepKey, step)
</script>

<template>
  <div>
    <h2>Counter Component</h2>
    <p style="font-size: 0.8rem; color: #888;">
      theme (injected): {{ theme }} · step (provided): {{ step }}
    </p>
    <p>Count: {{ counter.count }}</p>
    <p>Double count: {{ counter.doubleCount }}</p>
    <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
      <button @click="counter.increment()">+{{ step }}</button>
      <button @click="counter.decrement()">-{{ step }}</button>
      <button @click="counter.reset()">Reset</button>
      <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem;">
        step
        <input v-model.number="step" type="number" min="1" max="10" style="width: 3rem;" />
      </label>
    </div>
  </div>
</template>
