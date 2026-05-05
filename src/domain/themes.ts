export type AccentPreset = 'rust' | 'ocean' | 'forest' | 'plum'

export interface AccentPresetMeta {
  key: AccentPreset
  name: { zh: string; en: string }
  hex: string
}

export const ACCENT_PRESETS: AccentPresetMeta[] = [
  { key: 'rust',   name: { zh: '赭石', en: 'Rust'   }, hex: '#c96442' },
  { key: 'ocean',  name: { zh: '海蓝', en: 'Ocean'  }, hex: '#4A7090' },
  { key: 'forest', name: { zh: '松绿', en: 'Forest' }, hex: '#5A7A5E' },
  { key: 'plum',   name: { zh: '烟紫', en: 'Plum'   }, hex: '#8A6A7A' },
]
