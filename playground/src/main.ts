import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { analyticsKey } from './injection-keys'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./components/Counter.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./components/ChildComponent.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('./components/Dashboard.vue'),
    },
    {
      path: '/i18n',
      name: 'i18n',
      component: () => import('./components/I18nDemo.vue'),
    },
  ],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      greeting: 'Hello, World!',
      description: 'This page demonstrates vue-i18n integration.',
      currentLocale: 'Current locale',
      switchTo: 'Switch to',
      counter: {
        title: 'Counter',
        value: 'Current value: {n}',
      },
    },
    ru: {
      greeting: 'Привет, мир!',
      description: 'Эта страница демонстрирует интеграцию vue-i18n.',
      currentLocale: 'Текущая локаль',
      switchTo: 'Переключить на',
      counter: {
        title: 'Счётчик',
        value: 'Текущее значение: {n}',
      },
    },
    de: {
      greeting: 'Hallo, Welt!',
      description: 'Diese Seite demonstriert die vue-i18n-Integration.',
      currentLocale: 'Aktuelle Sprache',
      switchTo: 'Wechseln zu',
      counter: {
        title: 'Zähler',
        value: 'Aktueller Wert: {n}',
      },
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

// App-level Symbol provide — visible in get-provide-inject-tree as appProvides with keyType: 'symbol'
app.provide(analyticsKey, {
  track: (event: string) => console.log(`[analytics] ${event}`),
})

app.mount('#app')
