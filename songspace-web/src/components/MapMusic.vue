<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhMusicNotes, PhSpeakerHigh, PhSpeakerSlash, PhArrowSquareOut } from '@phosphor-icons/vue'
import type { WorldId } from '@/worlds/types'
import { WORLD_OPTIONS } from '@/worlds/types'

const props = defineProps<{ world: WorldId; active: boolean; paused: boolean }>()
type Track = { title: string; artist: string; song_url: string; audio_url: string }
const tracks = ref<Partial<Record<WorldId, Track>>>({})
const current = computed(() => tracks.value[props.world])
const audioSource = computed(() => {
  const url = current.value?.audio_url
  return url ? /^(https?:\/\/|\/)/.test(url) ? url : import.meta.env.BASE_URL + url : undefined
})
const title = computed(() => current.value?.title || WORLD_OPTIONS.find(w => w.id === props.world)!.title)
const audio = ref<HTMLAudioElement>()
const muted = ref(false)
const error = ref('')
const playing = ref(false)
let attempt = 0
async function play() {
  const id = ++attempt
  if (!audio.value || !current.value?.audio_url || muted.value || props.paused) return
  error.value = ''
  try { await audio.value.play() } catch (cause) {
    if (id !== attempt) return
    error.value = cause instanceof DOMException && cause.name === 'NotAllowedError' ? '点击开启音乐' : '音源暂不可用'
  }
}
function stop() { ++attempt; audio.value?.pause(); if (audio.value) audio.value.currentTime = 0 }
function toggle() {
  muted.value = !muted.value
  if (muted.value) { ++attempt; audio.value?.pause() }
  else if (props.active && !props.paused) void play()
}
watch(() => [props.active, props.paused, muted.value], () => {
  if (!props.active) stop()
  else if (props.paused || muted.value) { ++attempt; audio.value?.pause() }
  else void play()
})
watch(() => props.world, () => { stop(); error.value = '' })
watch(audioSource, async () => {
  await nextTick()
  if (props.active && !props.paused && !muted.value) void play()
})
onMounted(async () => {
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'catalog/map-music.json')
    if (!response.ok) throw new Error()
    tracks.value = await response.json()
  } catch { error.value = '音乐配置未载入' }
})
onBeforeUnmount(stop)
defineExpose({ play, stop })
</script>

<template>
  <div class="map-music" :class="{ 'in-race': active }">
    <span class="map-music-icon" :class="{ playing }"><PhMusicNotes :size="18" weight="duotone" /></span>
    <span class="map-music-copy"><b>{{ title }}</b><small>{{ error || (!current?.audio_url ? '地图音乐 · 音源待接入' : muted ? '音乐已关闭' : paused ? '随闯关暂停' : playing ? '正在播放地图音乐' : '地图音乐') }}</small></span>
    <button v-if="current?.audio_url" :aria-label="muted ? '开启地图音乐' : error ? '重试播放地图音乐' : '关闭地图音乐'" @click="error && !muted ? play() : toggle()"><PhSpeakerSlash v-if="muted" :size="18" /><PhSpeakerHigh v-else :size="18" /></button>
    <a v-if="current?.song_url" :href="current.song_url" target="_blank" rel="noopener noreferrer" aria-label="在QQ音乐打开地图歌曲"><PhArrowSquareOut :size="17" /></a>
    <audio ref="audio" :src="audioSource" preload="metadata" loop :volume="0.45" @playing="playing = true" @pause="playing = false" @error="error = '音源暂不可用'" />
  </div>
</template>

<style scoped>
.map-music{position:absolute;left:18px;bottom:18px;z-index:5;display:flex;align-items:center;gap:10px;max-width:calc(100% - 36px);padding:9px 11px;border:1px solid #ffffff9c;border-radius:11px;background:#f7faf5ec;color:#40574c;box-shadow:0 3px 12px #243c3220;backdrop-filter:blur(14px)}
.map-music-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#e1ebe3;color:#688976}.map-music-copy{display:grid;gap:3px;min-width:0}.map-music-copy b{font-size:12px;font-weight:500}.map-music-copy small{font-size:9px;color:#83918a}.map-music button,.map-music a{display:grid;place-items:center;width:29px;height:29px;padding:0;border:0;border-radius:7px;background:transparent;color:#6e8177;cursor:pointer}.map-music button:hover,.map-music a:hover{background:#e4ece5}.map-music button:focus-visible,.map-music a:focus-visible{outline:2px solid #8ca797;outline-offset:2px}
.map-music.in-race{left:auto;bottom:auto;right:18px;top:72px}
.playing{animation:music-breathe 1.8s ease-in-out infinite}@keyframes music-breathe{50%{background:#cbded0}}@media(prefers-reduced-motion:reduce){.playing{animation:none}}@media(max-width:650px){.map-music{left:10px;bottom:10px;padding:6px 8px}.map-music-icon{width:26px;height:26px}}
</style>
