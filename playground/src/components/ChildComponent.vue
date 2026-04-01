<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Hello from ChildComponent!')
</script>

<template>
  <div>
    <h2>About Page</h2>
    <p>{{ message }}</p>
    <p>This is a child component used for testing MCP tools like <code>get-component-state</code> and <code>get-component-by-file</code>.</p>
  </div>
</template>
