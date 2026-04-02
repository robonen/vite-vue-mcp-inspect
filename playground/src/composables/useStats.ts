import { computed, reactive, ref } from 'vue'

const history = reactive<number[]>([])
const total = ref(0)
const multiplier = ref(1)

const adjustedTotal = computed(() => total.value * multiplier.value)
const average = computed(() => history.length ? adjustedTotal.value / history.length : 0)
const peak = computed(() => history.length ? Math.max(...history) : 0)
const summary = computed(() => `total=${adjustedTotal.value} avg=${average.value.toFixed(1)} peak=${peak.value}`)

export function useStats() {
  function record(value: number) {
    total.value += value
    history.push(value)
  }
  function reset() {
    total.value = 0
    history.length = 0
  }
  return reactive({ history, total, multiplier, adjustedTotal, average, peak, summary, record, reset })
}
