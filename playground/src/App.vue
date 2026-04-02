<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div style="max-width: 600px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif;">
    <h1>Vue MCP Playground</h1>
    <nav style="display: flex; gap: 1rem; margin-bottom: 2rem;">
      <RouterLink to="/">Home (Counter)</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/dashboard">Dashboard</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>
