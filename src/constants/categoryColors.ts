import { useState, useEffect } from 'react'
import type { CategoryId } from '@/domain/category'
import { useAppSettingsStore } from '@/stores/settingsStore'

export interface CategoryColors {
  fill: string
  bg: string
  text: string
}

function readCategoryColors(): Record<CategoryId, CategoryColors> {
  const cs = getComputedStyle(document.body)
  const read = (v: string) => cs.getPropertyValue(v).trim()
  return {
    accent: { fill: read('--event-accent-fill'), bg: read('--event-accent-bg'), text: read('--event-accent-text') },
    sage:   { fill: read('--event-sage-fill'),   bg: read('--event-sage-bg'),   text: read('--event-sage-text') },
    sand:   { fill: read('--event-sand-fill'),   bg: read('--event-sand-bg'),   text: read('--event-sand-text') },
    sky:    { fill: read('--event-sky-fill'),    bg: read('--event-sky-bg'),    text: read('--event-sky-text') },
    rose:   { fill: read('--event-rose-fill'),   bg: read('--event-rose-bg'),   text: read('--event-rose-text') },
    stone:  { fill: read('--event-stone-fill'),  bg: read('--event-stone-bg'),  text: read('--event-stone-text') },
  }
}

export function getCategoryColors(): Record<CategoryId, CategoryColors> {
  if (typeof document === 'undefined') {
    // SSR / test fallback — return empty strings
    const empty = { fill: '', bg: '', text: '' }
    return { accent: empty, sage: empty, sand: empty, sky: empty, rose: empty, stone: empty }
  }
  return readCategoryColors()
}

export function useCategoryColors(): Record<CategoryId, CategoryColors> {
  const theme = useAppSettingsStore((s) => s.settings.theme)
  const [colors, setColors] = useState<Record<CategoryId, CategoryColors>>(getCategoryColors)

  useEffect(() => {
    setColors(getCategoryColors())
  }, [theme])

  return colors
}
