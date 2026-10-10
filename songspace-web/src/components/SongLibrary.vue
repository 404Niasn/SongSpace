<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { coverPath } from '@/game/coverAssets'

interface Song {
  id: string
  rank: number
  title: string
  artists: { name: string; qqmusic_mid: string }[]
  album: string
  duration_seconds: number
  song_url: string
  cover_path: string
}
const songs = ref<Song[]>([])
const chartDate = ref('')
const query = ref('')
const sort = ref('rank')
const loading = ref(true)
const error = ref('')
const selected = ref<Song | null>(null)
const detail = ref<HTMLDialogElement>()
const abort = new AbortController()
const artists = (song: Song) => song.artists.map((artist) => artist.name).join(' / ')
const cover = (song: Song) => coverPath(song.cover_path)
const filtered = computed(() => {
  const search = query.value.trim().toLocaleLowerCase()
  const result = songs.value.filter((song) =>
    `${song.title} ${artists(song)} ${song.album}`.toLocaleLowerCase().includes(search),
  )
  return result.sort((a, b) =>
    sort.value === 'rank' ? (a.rank || Infinity) - (b.rank || Infinity) : a.title.localeCompare(b.title, 'zh-CN'),
  )
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'catalog/qqmusic-hot-100.json', {
      signal: abort.signal,
    })
    if (!response.ok) throw new Error('Could not load the song catalog')
    const catalog = await response.json()
    if (!Array.isArray(catalog.songs) || !catalog.songs.length)
      throw new Error('Invalid song catalog')
    songs.value = catalog.songs
    chartDate.value = catalog.source.chart_date
  } catch (cause) {
    if (!abort.signal.aborted) {
      console.error(cause)
      error.value = '歌曲图鉴暂时没有载入，请重试。'
    }
  } finally {
    loading.value = false
  }
}
async function open(song: Song) {
  selected.value = song
  await nextTick()
  detail.value?.showModal()
}
function close() {
  detail.value?.close()
  selected.value = null
}
function closeBackdrop(event: MouseEvent) {
  if (event.target === detail.value) close()
}
onMounted(load)
onBeforeUnmount(() => abort.abort())
</script>

<template>
  <section class="song-library" aria-label="歌曲图鉴">
    <div class="library-heading">
      <div>
        <p class="section-label">音乐，值得被看见</p>
        <h1>
          歌曲图鉴 <span>{{ songs.length || '—' }}</span>
        </h1>
        <p class="library-description">精选了 QQ 音乐热歌榜 Top 100 和经典歌曲。</p>
      </div>
      <div class="chart-source">
        QQ 音乐 · 热歌榜 Top 100 与经典歌曲<small>{{ chartDate ? `榜单采集日期 ${chartDate}` : '正在载入' }}</small>
      </div>
    </div>
    <div class="library-toolbar">
      <label class="song-search"
        ><span>搜索</span
        ><input
          v-model="query"
          type="search"
          placeholder="歌名、歌手或专辑"
          aria-label="搜索歌曲、歌手或专辑" /></label
      ><label class="song-sort"
        ><span>排序</span
        ><select v-model="sort" aria-label="歌曲排序">
          <option value="rank">榜单顺序</option>
          <option value="title">歌名排序</option>
        </select></label
      ><span class="search-count">{{ filtered.length }} 首歌曲</span>
    </div>
    <div v-if="loading" class="library-empty" role="status">正在翻开歌曲图鉴…</div>
    <div v-else-if="error" class="library-empty" role="alert">
      <p>{{ error }}</p>
      <button class="secondary-button" @click="load">重新载入</button>
    </div>
    <div v-else-if="!filtered.length" class="library-empty">
      没有找到这首歌，试试歌手名或另一个关键词。
    </div>
    <div v-else class="song-grid">
      <button
        v-for="song in filtered"
        :key="song.id"
        class="song-card"
        :aria-label="`查看《${song.title}》，${artists(song)}`"
        @click="open(song)"
      >
        <div class="song-cover">
          <img :src="cover(song)" :alt="`${song.album} 专辑封面`" loading="lazy" /><span
            class="song-rank"
            >{{ song.rank ? String(song.rank).padStart(2, '0') : '特选' }}</span
          ><span class="cover-open">查看歌曲</span>
        </div>
        <h2 :title="song.title">{{ song.title }}</h2>
        <p :title="artists(song)">{{ artists(song) }}</p>
      </button>
    </div>
    <dialog ref="detail" class="song-dialog" @click="closeBackdrop" @close="selected = null">
      <template v-if="selected"
        ><button class="dialog-close" aria-label="关闭歌曲详情" @click="close">×</button
        ><img class="detail-cover" :src="cover(selected)" :alt="`${selected.album} 专辑封面`" />
        <div class="song-detail-body">
          <p class="section-label">{{ selected.rank ? `QQ 音乐热歌榜第 ${selected.rank} 名 · 采集于 ${chartDate}` : '经典歌曲 · 榜单外精选' }}</p>
          <h2>{{ selected.title }}</h2>
          <p class="detail-artist">{{ artists(selected) }}</p>
          <dl>
            <dt>专辑</dt>
            <dd>{{ selected.album }}</dd>
            <dt>时长</dt>
            <dd>
              {{ Math.floor(selected.duration_seconds / 60) }}:{{
                String(selected.duration_seconds % 60).padStart(2, '0')
              }}
            </dd>
          </dl>
          <a
            class="primary-button"
            :href="selected.song_url"
            target="_blank"
            rel="noopener noreferrer"
            >去 QQ 音乐听 </a
          >
        </div></template
      >
    </dialog>
  </section>
</template>
