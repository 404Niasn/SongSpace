<script setup lang="ts">
import { useId } from 'vue'
import type { AchievementIcon } from '@/game/save'
defineProps<{ icon: AchievementIcon; tone?: string; locked?: boolean }>()
const id = useId()
</script>

<template>
  <svg
    class="achievement-badge"
    :class="[tone, { locked }]"
    viewBox="0 0 100 112"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="id + '-metal'" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#fff" />
        <stop offset=".28" stop-color="#e1e7f2" />
        <stop offset=".55" stop-color="#92abc4" />
        <stop offset=".75" stop-color="#f9fcff" />
        <stop offset="1" stop-color="#a7bbd2" />
      </linearGradient>
      <linearGradient :id="id + '-enamel'" x1="0" y1="0" x2=".8" y2="1">
        <stop stop-color="var(--badge-light)" />
        <stop offset="1" stop-color="var(--badge-dark)" />
      </linearGradient>
    </defs>
    <path
      d="m27 74-7 31 19-8 11 12 5-34M73 74l7 31-19-8-11 12-5-34"
      fill="var(--badge-ribbon)"
      stroke="#fff"
      stroke-width="2"
    />
    <path
      d="M50 3 63 9 77 10 84 23 95 33 93 48 96 62 85 73 78 86 63 87 50 94 37 87 22 86 15 73 4 62 7 48 5 33 16 23 23 10 37 9Z"
      :fill="`url(#${id}-metal)`"
      stroke="#b8c7d8"
    />
    <circle cx="50" cy="48" r="36" :fill="`url(#${id}-enamel)`" stroke="#fff" stroke-width="2" />
    <circle cx="50" cy="48" r="31" fill="none" stroke="var(--badge-ink)" stroke-opacity=".18" />
    <path
      d="M24 35a29 29 0 0 1 41-11"
      fill="none"
      stroke="#fff"
      stroke-width="3"
      stroke-linecap="round"
      opacity=".7"
    />
    <g
      fill="none"
      stroke="var(--badge-ink)"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <g v-if="icon === 'wheel'">
        <circle cx="32" cy="57" r="10" />
        <circle cx="68" cy="57" r="10" />
        <path d="m32 57 11-21 13 21H32l14-15h16l6 15M57 31h7l-3 11M39 35h9" />
      </g>
      <g v-else-if="icon === 'route'">
        <path d="M30 66h29a9 9 0 0 0 0-18H41a9 9 0 0 1 0-18h13" />
        <circle cx="29" cy="66" r="4" />
        <path
          d="m62 25 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"
          fill="var(--badge-ink)"
          stroke-width="1"
        />
      </g>
      <g v-else-if="icon === 'trophy'">
        <path
          d="M38 28h24v16a12 12 0 0 1-24 0ZM38 33H29v6a12 12 0 0 0 12 12M62 33h9v6a12 12 0 0 1-12 12M50 56v12M40 69h20"
        />
        <path
          d="m50 33 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z"
          fill="var(--badge-ink)"
          stroke="none"
        />
      </g>
      <g v-else-if="icon === 'disc'">
        <circle cx="50" cy="48" r="21" />
        <circle cx="50" cy="48" r="7" />
        <path d="M34 46a16 16 0 0 1 14-14M66 50a16 16 0 0 1-14 14M39 46a11 11 0 0 1 9-9" />
      </g>
      <g v-else-if="icon === 'collection'">
        <path d="M30 36v31h34M35 31v31h34" />
        <rect x="40" y="26" width="34" height="31" rx="4" />
        <circle cx="57" cy="42" r="10" />
        <circle cx="57" cy="42" r="2" />
      </g>
      <g v-else-if="icon === 'spark'">
        <rect x="33" y="32" width="34" height="38" rx="4" />
        <path d="M33 40h34M42 53h8v9M50 53v-7l9-2v14" />
        <path d="m70 22 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="var(--badge-ink)" stroke-width="1" />
      </g>
      <g v-else-if="icon === 'sun'">
        <circle cx="50" cy="48" r="13" />
        <path
          d="M50 25v-3M50 71v3M27 48h-3M73 48h3M34 32l-3-3M66 64l3 3M34 64l-3 3M66 32l3-3m-25 17 5 5 9-10"
        />
      </g>
      <g v-else>
        <path d="M31 52v-8a19 19 0 0 1 38 0v8M69 61v3a7 7 0 0 1-7 7h-9" />
        <rect x="28" y="46" width="9" height="17" rx="4" />
        <rect x="63" y="46" width="9" height="17" rx="4" />
        <path d="M52 36v19l-9 3M52 36l7 2" />
        <ellipse cx="44" cy="58" rx="4" ry="3" fill="var(--badge-ink)" />
      </g>
    </g>
    <path d="m19 18 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" fill="#fff" />
  </svg>
</template>

<style scoped>
.achievement-badge {
  --badge-light: #e5f8f2;
  --badge-dark: #9dd3c9;
  --badge-ink: #285c59;
  --badge-ribbon: #89bdb8;
  width: 100px;
  height: 112px;
  flex-shrink: 0;
  filter: drop-shadow(0 5px 5px #5a77951c);
}
.achievement-badge.收藏 {
  --badge-light: #e9efff;
  --badge-dark: #a7bde8;
  --badge-ink: #344f84;
  --badge-ribbon: #92a9d5;
}
.achievement-badge.日常 {
  --badge-light: #fff4d8;
  --badge-dark: #e6c37b;
  --badge-ink: #795822;
  --badge-ribbon: #d9b56e;
}
.achievement-badge.locked {
  filter: grayscale(1);
  opacity: 0.55;
}
</style>
