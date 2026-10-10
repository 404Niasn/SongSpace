<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PhSun, PhSunHorizon, PhCloudRain, PhCloud, PhSnowflake, PhCaretDown, PhCheck } from '@phosphor-icons/vue'
import type { GameCard } from '@/game/save'
import { imageryFor } from '@/game/content'

const props = defineProps<{ modelValue: string; cards: GameCard[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const open = ref(false)
const options = computed(() => [
  { id: '', name: '默认天气', song: '地图原生光照', icon: PhSun },
  ...props.cards.map(card => ({ id: card.id, name: imageryFor(card.song.title).name, song: `《${card.song.title}》`, icon: ({ rain: PhCloudRain, snow: PhSnowflake, overcast: PhCloud, sunset: PhSunHorizon })[imageryFor(card.song.title).weather!] })),
])
const selected = computed(() => options.value.find(option => option.id === props.modelValue) || options.value[0]!)
function select(value: string) { emit('update:modelValue', value); open.value = false; trigger.value?.focus() }
function outside(event: PointerEvent) { if (!root.value?.contains(event.target as Node)) open.value = false }
function keyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') { open.value = false; trigger.value?.focus(); return }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  open.value = true
  requestAnimationFrame(() => {
    const buttons = Array.from(root.value?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || [])
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowUp' ? (current <= 0 ? buttons.length - 1 : current - 1) : (current + 1) % buttons.length
    buttons[index]?.focus()
  })
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <div ref="root" class="weather-picker" @keydown="keyboard" @focusout="event => { if (!root?.contains(event.relatedTarget as Node)) open = false }">
    <button ref="trigger" class="weather-trigger" aria-label="选择已解锁天气" aria-haspopup="menu" :aria-expanded="open" @click="open = !open">
      <span class="weather-icon" :class="{ rain: [PhCloudRain, PhSnowflake, PhCloud].includes(selected.icon), sunset: selected.icon === PhSunHorizon }"><component :is="selected.icon" :size="21" weight="duotone" /></span>
      <span class="weather-label"><small>世界天气</small><b>{{ selected.name }}</b></span>
      <PhCaretDown class="weather-caret" :class="{ open }" :size="13" />
    </button>
    <Transition name="weather-menu">
      <div v-if="open" class="weather-options" role="menu" aria-label="已解锁天气">
        <span class="weather-menu-label">选择天气</span>
        <button v-for="option in options" :key="option.id" role="menuitemradio" :aria-checked="modelValue === option.id" :class="{ selected: modelValue === option.id }" @click="select(option.id)">
          <span class="weather-icon" :class="{ rain: [PhCloudRain, PhSnowflake, PhCloud].includes(option.icon), sunset: option.icon === PhSunHorizon }"><component :is="option.icon" :size="22" weight="duotone" /></span>
          <span class="weather-option-copy"><b>{{ option.name }}</b><small>{{ option.song }}</small></span>
          <PhCheck v-if="modelValue === option.id" :size="16" weight="bold" />
        </button>
        <p v-if="cards.length === 0">收集《黄昏》《雨爱》《认真的雪》《阴天》解锁天气</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.weather-picker{position:relative;flex-shrink:0;color:#40504b}
.weather-picker .weather-trigger{display:flex;align-items:center;gap:10px;min-width:176px;padding:7px 12px 7px 8px;border:1px solid #d9e3df;border-radius:10px;background:linear-gradient(125deg,#fff,#f3f7f5);box-shadow:inset 0 1px #fff,0 2px 5px #354f4010;text-align:left;cursor:pointer}
.weather-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;background:#f3eddd;color:#a18b54;flex-shrink:0}.weather-icon.rain{background:#e6eef3;color:#7194a9}.weather-icon.sunset{background:#f5e7dc;color:#bd916b}
.weather-label,.weather-option-copy{display:grid;gap:3px;flex:1}.weather-label small{font-size:9px;color:#8d9c94;line-height:1}.weather-label b{font-size:12px;font-weight:500;line-height:1.4}.weather-caret{color:#879b92;transition:transform .2s}.weather-caret.open{transform:rotate(180deg)}
.weather-options{position:absolute;top:calc(100% + 8px);left:0;z-index:30;width:250px;max-width:calc(100vw - 40px);padding:8px;border:1px solid #dce5e0;border-radius:13px;background:#fffffffa;box-shadow:0 14px 35px #3451441c,0 3px 8px #3451440b;backdrop-filter:blur(18px)}
.weather-menu-label{display:block;padding:7px 9px 10px;color:#8c9991;font-size:10px;letter-spacing:.5px}.weather-options button{display:flex;align-items:center;gap:11px;width:100%;padding:9px;border:0;border-radius:8px;background:transparent;text-align:left;color:#4a5e53;cursor:pointer}.weather-options button:hover,.weather-options button:focus-visible{background:#f3f6f4}.weather-options button.selected{background:#edf4ef}.weather-option-copy b{font-size:12px;font-weight:500}.weather-option-copy small{font-size:10px;color:#929d96}.weather-options>p{margin:8px 9px 5px;font-size:10px;color:#919d96;line-height:1.6}
.weather-trigger:focus-visible,.weather-options button:focus-visible{outline:2px solid #a4bfb1;outline-offset:2px}.weather-menu-enter-active,.weather-menu-leave-active{transition:opacity .16s,transform .16s}.weather-menu-enter-from,.weather-menu-leave-to{opacity:0;transform:translateY(-5px)}
</style>
