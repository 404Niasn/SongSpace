<script setup lang="ts">
import VehiclePreview from './VehiclePreview.vue'
import { computed, ref } from 'vue'
import SongCard from './SongCard.vue'
import CharacterWardrobe from './CharacterWardrobe.vue'
import { PhHeadphones } from '@phosphor-icons/vue'
import { catalog, game, cardFor, KIND_NAMES, ownedCount, persist, equipOutfit, type GameCard } from '@/game/save'
import { artPath, imageryFor, skillLevel } from '@/game/content'
import { availableImagery, placedCount } from '@/game/imagery'
const emit = defineEmits<{ equip: [GameCard]; decorate: [GameCard]; message: [text: string] }>()
const section = ref<'songs' | 'outfits'>('songs')
import { coverPath } from '@/game/coverAssets'
const query = ref(''),
  filter = ref('all'),
  ownedOnly = ref(false),
  selected = ref<GameCard | null>(null)
const cards = computed(() =>
  catalog.songs
    .map((s) => cardFor(s))
    .filter(
      (c) =>
        (!ownedOnly.value || c.count > 0) &&
        (filter.value === 'all' || c.kind === filter.value) &&
        `${c.song.title} ${c.song.artists.map((a) => a.name).join(' ')}`.includes(query.value),
    ),
)
function use(c: GameCard) {
  if (!c.count) return
  if (c.outfit && equipOutfit(c.outfit.id)) {
    section.value = 'outfits'
    emit('message', `已穿戴${c.outfit.name}，进入探索即可看到。`)
    selected.value = null; persist(); return
  }
  if (c.kind === 'item' || c.kind === 'vehicle' || c.kind === 'map') emit('equip', c)
  else if (c.kind === 'decoration') emit('decorate', c)
  selected.value = null
  persist()
}
</script>
<template>
  <section class="warehouse-page" :class="{ 'wardrobe-page': section === 'outfits' }">
    <div class="page-heading">
      <div>
        <p class="eyebrow">SONGSPACE / COLLECTION</p>
        <h1>
          我的歌曲仓库 <span>{{ ownedCount }}<small>/{{ catalog.songs.length }}</small></span>
        </h1>
        <p>拥有的歌亮起来，还没遇见的歌等你拆开。</p>
      </div>
      <label v-if="section === 'songs'" class="owned-toggle"><input type="checkbox" v-model="ownedOnly" />只看已拥有</label>
    </div>
    <div class="filter-tabs wardrobe-sections" aria-label="仓库分类">
      <button :class="{ active: section === 'songs' }" :aria-pressed="section === 'songs'" @click="section = 'songs'">歌曲收藏</button>
      <button :class="{ active: section === 'outfits' }" :aria-pressed="section === 'outfits'" @click="section = 'outfits'">人物装扮</button>
    </div>
    <template v-if="section === 'songs'">
    <div class="warehouse-tools">
      <div class="filter-tabs">
        <button
          v-for="(label, key) in {
            all: '全部',
            decoration: '装饰',
            item: '道具',
            vehicle: '载具',
            map: '地图',
            outfit: '装扮',
          }"
          :key="key"
          :class="{ active: filter === key }"
          @click="filter = key"
        >
          {{ label }}
        </button>
      </div>
      <input
        v-model="query"
        type="search"
        placeholder="搜索歌曲 / 歌手"
        aria-label="搜索仓库歌曲"
      />
    </div>
    <div v-if="!cards.length" class="collection-empty">这里还没有歌曲，去开一包吧。</div>
    <div class="collection-grid">
      <button
        v-for="card in cards"
        :key="card.id"
        class="collection-card"
        :class="[card.rarity, { unowned: !card.count }]"
        @click="selected = card"
        :aria-label="`${card.song.title}，${card.count ? '已拥有 ' + card.count + ' 张' : '未获得'}`"
      >
        <SongCard :card="card" collection />
      </button>
    </div>
    </template>
    <CharacterWardrobe v-else @message="emit('message', $event)" />
  </section>
  <div
    v-if="selected"
    class="card-detail-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="卡片详情"
    @click.self="selected = null"
  >
    <article class="card-detail" :class="selected.rarity">
      <button class="opening-close" aria-label="关闭卡片详情" @click="selected = null">×</button
      ><SongCard :card="selected" large />
      <div>
        <p class="eyebrow">
          {{ KIND_NAMES[selected.kind] }} ·
          {{
            selected.rarity === 'rainbow' ? '彩卡' : selected.rarity === 'gold' ? '金卡' : '普通卡'
          }}
        </p>
        <h2>{{ selected.song.title }}</h2>
        <p>{{ selected.song.artists.map((a) => a.name).join(' / ') }}</p>
        <p>{{ selected.effect }}</p>
        <VehiclePreview v-if="selected.song.vehicle_model" :key="selected.id" :model="selected.song.vehicle_model" />
        <div v-if="selected.outfit" class="outfit-card-detail"><img :src="coverPath(selected.outfit.preview)" :alt="selected.outfit.name" /><p>{{ selected.outfit.description }}</p></div>
        <div v-if="selected.art" class="imagery-detail"><img :src="artPath(selected.art)" :alt="selected.effect"/><blockquote>{{ selected.prose }}</blockquote></div>
        <p>
          {{
            selected.count
              ? selected.outfit ? `拥有 ${selected.count} 张 · 装扮已解锁，穿戴不消耗卡片` : selected.kind === 'decoration' ? imageryFor(selected.song.title).weather ? `天气已解锁 · 可在各地图启用 · 装饰值 +${imageryFor(selected.song.title).value}` : `总拥有 ${selected.count} 件 · 已摆放 ${placedCount(selected.id)} 件 · 可用 ${availableImagery(selected.id)} 件 · 每件装饰值 +${imageryFor(selected.song.title).value}` : `拥有 ${selected.count} 张 · 等级 ${skillLevel(selected.count)}`
              : '未获得 · 可以通过卡包收集'
          }}
        </p>
        <button v-if="selected.count" class="lime-btn" :disabled="!selected.outfit && selected.kind === 'decoration' && !imageryFor(selected.song.title).weather && availableImagery(selected.id) < 1" @click="use(selected)">
          {{
            selected.outfit ? '穿戴这件装扮' : selected.kind === 'map'
              ? `选择《${selected.song.title}》地图`
              : selected.kind === 'vehicle'
                ? '装备' + (selected.song.vehicle_name || '载具')
                : selected.kind === 'item'
                  ? '携带这件道具'
                  : imageryFor(selected.song.title).weather ? '启用' + imageryFor(selected.song.title).name : '去布置意象装饰'
          }}
        </button>
        <p v-if="selected.kind === 'map'">
          {{ `已解锁《${selected.song.title}》地图，可进入探索与微缩世界。` }}
        </p>
        <a
          class="music-link"
          :href="selected.song.song_url"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`去 QQ 音乐听《${selected.song.title}》`"
          ><PhHeadphones :size="19" weight="duotone" /><span>去 QQ 音乐听</span></a
        >
      </div>
    </article>
  </div>
</template>
<style scoped>
.card-detail .music-link{display:inline-flex;align-items:center;gap:9px;min-height:42px;margin-top:14px;padding:0 15px;border:1px solid #c4dbcd;border-radius:9px;background:linear-gradient(125deg,#f3faf4,#e4f1e8);color:#397558;font-size:12px;font-weight:500;text-decoration:none;box-shadow:inset 0 1px #fff;transition:background .15s,border-color .15s}.card-detail .music-link:hover{background:#deede2;border-color:#a3c7b0}.card-detail .music-link:focus-visible{outline:2px solid #78ab8c;outline-offset:3px}
.wardrobe-page .wardrobe-sections{margin-bottom:0}
.wardrobe-sections{display:flex;width:fit-content;margin-bottom:20px}.wardrobe-sections button{padding:11px 20px;font-size:12px}.outfit-card-detail{display:flex;gap:12px;align-items:center;margin:16px 0}.outfit-card-detail img{width:95px;height:95px;border-radius:8px}.outfit-card-detail p{font-size:12px;line-height:1.7}
</style>
