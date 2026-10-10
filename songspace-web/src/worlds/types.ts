import type { Group, Mesh, ShaderMaterial, Vector3 } from 'three'
import forestCover from '@/assets/map-covers/003S4zP93vJRib.jpg'
import seaCover from '@/assets/map-covers/001dW8Ey2VtnuP.jpg'
import jiangnanCover from '@/assets/map-covers/000y5gq7449K9I.jpg'

export type WorldId = 'forest' | 'sea' | 'jiangnan' | 'fuji' | 'space'
export type ViewMode = 'overview' | 'roam'
export type DecorationKind = 'bench' | 'lamp' | 'flowers'

import fujiCover from '@/assets/covers/qqmusic/004Z85XP1c25b7.jpg'
import spaceCover from '@/assets/covers/qqmusic/001mTkmb4GJlh4.jpg'

export const WORLD_OPTIONS = [
  {
    id: 'forest',
    title: '挪威的森林',
    artist: '伍佰',
    album: '爱情的尽头',
    cover: forestCover,
    english: 'NORWEGIAN WOOD',
    description: '把喧嚣留在林外。沿着溪流和林间小径，去找一间属于自己的小木屋。',
    scene: '针叶林 · 溪流 · 林间木屋',
    color: '#38644e',
    atmosphere: '林间晴日',
  },
  {
    id: 'sea',
    title: '大海',
    artist: '张雨生',
    album: '大海',
    cover: seaCover,
    english: 'THE OCEAN',
    description: '海风从远处吹来。沿着海岸公路前行，看灯塔、帆船，和一直延伸到天边的蓝。',
    scene: '海岸 · 灯塔 · 滨海公路',
    color: '#337a86',
    atmosphere: '海风与晴空',
  },
  {
    id: 'jiangnan',
    title: '江南',
    artist: '林俊杰',
    album: '第二天堂',
    cover: jiangnanCover,
    english: 'SOUTH OF THE RIVER',
    description: '一座桥，一条河，几间白墙黛瓦的房子。慢一点，让水乡的日子从身边经过。',
    scene: '水乡 · 石桥 · 白墙黛瓦',
    color: '#65736c',
    atmosphere: '水乡薄雾',
  },
  { id: 'fuji', title: '富士山下', artist: '陈奕迅', album: "What's Going On...?", cover: fujiCover, english: 'UNDER MOUNT FUJI', description: '沿樱花小径穿过鸟居，在湖畔望见覆雪的富士山。', scene: '雪山 · 樱花 · 湖畔鸟居', color: '#a4778c', atmosphere: '樱色晴空' },
  { id: 'space', title: '光年之外', artist: 'G.E.M.邓紫棋', album: '光年之外', cover: spaceCover, english: 'LIGHT YEARS AWAY', description: '沿星际栈道驶向远方，穿过星环与陨石，仰望无尽宇宙。', scene: '星球 · 星环 · 太空栈道', color: '#7477c4', atmosphere: '深空星河' },
] as const

export interface Decoration {
  songId?: string
  kind: DecorationKind
  x: number
  z: number
  rotation: number
}

export interface WorldModel {
  group: Group
  ground: Mesh
  water: ShaderMaterial
  spawn: Vector3
  colliders: { x: number; z: number; radius: number }[]
  isWalkable: (x: number, z: number) => boolean
  heightAt: (x: number, z: number) => number
  update: (time: number) => void
}
