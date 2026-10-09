const covers = import.meta.glob<string>('../assets/covers/qqmusic/*.jpg', { eager: true, query: '?url', import: 'default' })
const outfits = import.meta.glob<string>('../assets/outfits/*.svg', { eager: true, query: '?url', import: 'default' })

export function coverPath(path: string) {
  if (path.startsWith('art/outfits/')) path = '/' + path
  if (path.startsWith('/covers/qqmusic/')) return covers[`../assets${path}`] || `${import.meta.env.BASE_URL}${path.slice(1)}`
  if (path.startsWith('/art/outfits/')) return outfits[`../assets/outfits/${path.split('/').pop()}`] || `${import.meta.env.BASE_URL}${path.slice(1)}`
  return path
}
