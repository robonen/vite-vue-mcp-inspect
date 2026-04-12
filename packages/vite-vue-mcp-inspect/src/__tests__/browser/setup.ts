import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ViteDevServer } from 'vite'
import { createServer } from 'vite'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const TEST_PORT = 5173
const TEST_PROTOCOL = process.env.TEST_PROTOCOL === 'https' ? 'https' : 'http'

let vite: ViteDevServer
let browser: Browser
let page: Page

export async function setup() {
  // Start the playground Vite dev server (which loads the VueMcp plugin)
  vite = await createServer({
    configFile: resolve(__dirname, '../../../../../playground/vite.config.ts'),
    server: { port: TEST_PORT, strictPort: true },
  })
  await vite.listen()

  // Launch Chromium and load the playground
  browser = await chromium.launch()
  const context = await browser.newContext({ ignoreHTTPSErrors: TEST_PROTOCOL === 'https' })
  page = await context.newPage()
  await page.goto(`${TEST_PROTOCOL}://localhost:${TEST_PORT}/`)

  // Wait for Vue DevTools hook to be installed (overlay RPC connected)
  await page.waitForFunction(
    () => {
      const hook = (globalThis as any).__VUE_DEVTOOLS_GLOBAL_HOOK__
      return hook?.enabled && Array.isArray(hook.apps) && hook.apps.length > 0
    },
    { timeout: 15_000 },
  )
}

export async function teardown() {
  await page?.close().catch(() => {})
  await browser?.close().catch(() => {})
  await vite?.close().catch(() => {})
}
