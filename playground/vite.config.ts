import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueMcp from 'vite-vue-mcp-inspect'

export default defineConfig({
  root: __dirname,
  plugins: [
    vue(),
    VueMcp({
      printUrl: true,
      browserTimeout: 10_000,
    }),
  ],
})
