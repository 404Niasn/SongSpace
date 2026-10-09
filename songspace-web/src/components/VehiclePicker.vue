<script setup lang="ts">
import { coverPath } from '@/game/coverAssets'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PhBicycle, PhCaretDown, PhCheck } from '@phosphor-icons/vue'
import type { Song } from '@/game/save'
const props = defineProps<{ modelValue: string; songs: Song[] }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const trigger = ref<HTMLButtonElement>(), menu = ref<HTMLElement>(), open = ref(false)
const position = ref<Record<string, string>>({})
const selected = computed(() => props.songs.find(song => song.id === props.modelValue))
function place() {
  if (!trigger.value) return
  const box = trigger.value.getBoundingClientRect(), gap = 7, edge = 12
  const below = innerHeight - box.bottom - edge - gap, above = box.top - edge - gap
  const height = Math.min(240, Math.max(below, above))
  position.value = { left: Math.max(edge, Math.min(box.left, innerWidth - box.width - edge)) + 'px', width: box.width + 'px', maxHeight: height + 'px', top: below >= Math.min(240, above) ? box.bottom + gap + 'px' : 'auto', bottom: below >= Math.min(240, above) ? 'auto' : innerHeight - box.top + gap + 'px' }
}
function pick(id: string) { emit('update:modelValue', id); menu.value?.hidePopover(); trigger.value?.focus() }
function keyboard(event: KeyboardEvent) {
  const buttons = [...menu.value!.querySelectorAll<HTMLButtonElement>('button')]
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1
  if (next >= 0) { event.preventDefault(); buttons[next]?.focus() }
}
function showFromKeyboard(event: KeyboardEvent) { event.preventDefault(); place(); menu.value?.showPopover(); menu.value?.querySelector<HTMLButtonElement>('button')?.focus() }
onMounted(() => { window.addEventListener('resize', place); window.addEventListener('scroll', place, true) })
onBeforeUnmount(() => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) })
</script>
<template>
  <button ref="trigger" class="vehicle-picker-trigger" popovertarget="exploration-vehicle-menu" aria-haspopup="menu" :aria-expanded="open" aria-label="选择载具" @click="place" @keydown.down="showFromKeyboard">
    <img v-if="selected" :src="coverPath(selected.cover_path)" alt="" /><span v-else class="picker-bike"><PhBicycle :size="21" weight="duotone" /></span>
    <b>{{ selected?.vehicle_name || (selected ? '巡航自行车' : '初始单车') }}</b><PhCaretDown :size="15" :class="{ rotated: open }" />
  </button>
  <div id="exploration-vehicle-menu" ref="menu" popover="auto" class="vehicle-picker-menu" role="menu" aria-label="可用载具" :style="position" @toggle="open = ($event as ToggleEvent).newState === 'open'" @keydown="keyboard">
    <button role="menuitemradio" :aria-checked="!modelValue" :class="{ selected: !modelValue }" @click="pick('')"><span class="picker-bike"><PhBicycle :size="22" weight="duotone" /></span><b>初始单车</b><PhCheck v-if="!modelValue" :size="16" /></button>
    <button v-for="song in songs" :key="song.id" role="menuitemradio" :aria-checked="modelValue === song.id" :class="{ selected: modelValue === song.id }" @click="pick(song.id)"><img :src="coverPath(song.cover_path)" alt="" /><b>{{ song.vehicle_name || '巡航自行车' }}</b><PhCheck v-if="modelValue === song.id" :size="16" /></button>
  </div>
</template>
<style scoped>
.vehicle-picker-trigger{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:8px 10px;border:1px solid #d4e3d9;border-radius:10px;background:#f7faf8;color:#42634e;text-align:left;cursor:pointer}.vehicle-picker-trigger:hover,.vehicle-picker-trigger[aria-expanded=true]{background:#edf5f0;border-color:#9dbfa9}.vehicle-picker-trigger b{flex:1;font-size:12px;font-weight:550}.vehicle-picker-trigger>svg{transition:transform .18s}.rotated{transform:rotate(180deg)}.vehicle-picker-trigger img,.vehicle-picker-menu img,.picker-bike{width:30px;height:30px;object-fit:cover;border-radius:7px;flex-shrink:0}.picker-bike{display:grid;place-items:center;background:#e4efe8;color:#6b987b}
.vehicle-picker-menu{position:fixed;inset:auto;margin:0;padding:6px;border:1px solid #dce9e0;border-radius:12px;background:#fcfefd;box-shadow:0 12px 38px #2b4c3830;overflow:auto;box-sizing:border-box}.vehicle-picker-menu::backdrop{background:transparent}.vehicle-picker-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:7px;min-height:46px;text-align:left;color:#526c5c;cursor:pointer}.vehicle-picker-menu b{flex:1;min-width:0;font-size:11px;font-weight:500}.vehicle-picker-menu button:hover,.vehicle-picker-menu button:focus-visible{background:#f0f5f1}.vehicle-picker-menu button.selected{background:#e8f2ec;color:#3f7351}.vehicle-picker-trigger:focus-visible,.vehicle-picker-menu button:focus-visible{outline:2px solid #7ca38b;outline-offset:2px}
</style>
