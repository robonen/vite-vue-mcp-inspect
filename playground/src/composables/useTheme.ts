import { computed, reactive, ref } from 'vue'

const primaryColor = ref('#3498db')
const fontSize = ref(16)
const darkMode = ref(false)

const backgroundColor = computed(() => darkMode.value ? '#1a1a2e' : '#ffffff')
const textColor = computed(() => darkMode.value ? '#e0e0e0' : '#333333')
const cssVars = computed(() => ({
  '--primary': primaryColor.value,
  '--bg': backgroundColor.value,
  '--text': textColor.value,
  '--font-size': `${fontSize.value}px`,
}))

const themeLabel = computed(() =>
  `${darkMode.value ? 'Dark' : 'Light'} | ${fontSize.value}px | ${primaryColor.value}`,
)

export function useTheme() {
  return reactive({ primaryColor, fontSize, darkMode, backgroundColor, textColor, cssVars, themeLabel })
}
