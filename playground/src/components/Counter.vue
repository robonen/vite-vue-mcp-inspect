<script setup lang="ts">
import { useCounterStore } from '../stores/counter'

const counter = useCounterStore()
</script>

<template>
  <div>
    <h2>Counter Component</h2>
    <p>Count: {{ counter.count }}</p>
    <p>Double count: {{ counter.doubleCount }}</p>
    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
      <button @click="counter.increment()">+1</button>
      <button @click="counter.decrement()">-1</button>
      <button @click="counter.reset()">Reset</button>
    </div>
  </div>
</template>
