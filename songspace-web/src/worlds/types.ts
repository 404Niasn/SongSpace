import type { Group, Mesh, ShaderMaterial, Vector3 } from 'three'

export type WorldId = 'forest' | 'sea' | 'jiangnan'
export type ViewMode = 'overview' | 'roam'
export type DecorationKind = 'bench' | 'lamp' | 'flowers'

export const WORLD_OPTIONS = [
  {
    id: 'forest',
    title: '挪威的森林',
    artist: '伍佰',
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
    english: 'SOUTH OF THE RIVER',
    description: '一座桥，一条河，几间白墙黛瓦的房子。慢一点，让水乡的日子从身边经过。',
    scene: '水乡 · 石桥 · 白墙黛瓦',
    color: '#65736c',
    atmosphere: '水乡薄雾',
  },
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
