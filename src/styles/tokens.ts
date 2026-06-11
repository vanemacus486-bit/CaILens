/**
 * CalLens Design Tokens — JS 常量
 * 与 src/styles/tokens.css 数值完全一致，供图表库等 JS 配置引用。
 */

export const COLOR = {
  /* 纸 */
  paper: '#F2EEE3',
  surface: '#FAF7EF',
  surfaceRaised: '#FFFDF7',
  /* 墨 */
  ink: '#2B2620',
  ink2: '#6A6354',
  ink3: '#A39B87',
  /* 线 */
  line: '#E2DBC9',
  lineStrong: '#C8BFA8',
  /* 强调 */
  accent: '#BC4A26',
  accentSoft: '#F2DDD2',
  /* 分类色 */
  catMajor: '#BC4A26',
  catMajorBg: '#F4DCD1',
  catMinor: '#66793F',
  catMinorBg: '#E3E8D3',
  catChore: '#A87B23',
  catChoreBg: '#F0E3C4',
  catGrowth: '#4F6B80',
  catGrowthBg: '#DCE5EA',
  catLeisure: '#9A5468',
  catLeisureBg: '#ECDAE0',
  catSleep: '#7E776A',
  catSleepBg: '#E7E2D7',
  /* 饮食标签 */
  tagDietProtein: '#E8734A',
  tagDietStaple: '#D4A44A',
  tagDietVegetable: '#5B9E5B',
  tagDietFruit: '#C7A04A',
  tagDietCaffeine: '#7B5B3A',
  tagDietSugar: '#C97B7B',
  tagDietAlcohol: '#9B6B9B',
  tagDietFried: '#A08060',
  /* 卫生活动 */
  tagHygieneShower: '#5B9EBD',
  tagHygieneBrushTeeth: '#7BC47F',
  tagHygieneSkincare: '#D4A4C4',
  tagHygieneShave: '#C4A47B',
  tagHygieneHairWash: '#9B8BC4',
  tagHygieneNailCare: '#C4A47B',
  /* 时段 */
  tagPeriodMorning: '#7BC47F',
  tagPeriodNoon: '#D4A44A',
  tagPeriodAfternoon: '#E8734A',
  tagPeriodEvening: '#5B9EBD',
  tagPeriodNight: '#9B6B9B',
  /* 热力色阶不透明度 */
  heatmapOpacityRamp: [0, 0.22, 0.48, 0.75, 1],
} as const

export const FONT = {
  display: '"Noto Serif SC", "Source Han Serif SC", serif',
  ui: '"Noto Sans SC", "PingFang SC", system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", Consolas, monospace',
} as const

export const RADIUS = {
  s: '6px',
  m: '10px',
} as const

/** CSS 变量名 → 值的映射（兼容过渡期查询） */
export const TOKEN_VARS = {
  /* 纸 */
  '--paper': COLOR.paper,
  '--surface': COLOR.surface,
  '--surface-raised': COLOR.surfaceRaised,
  /* 墨 */
  '--ink': COLOR.ink,
  '--ink-2': COLOR.ink2,
  '--ink-3': COLOR.ink3,
  /* 线 */
  '--line': COLOR.line,
  '--line-strong': COLOR.lineStrong,
  /* 强调 */
  '--accent': COLOR.accent,
  '--accent-soft': COLOR.accentSoft,
  /* 分类色 */
  '--cat-major': COLOR.catMajor,
  '--cat-major-bg': COLOR.catMajorBg,
  '--cat-minor': COLOR.catMinor,
  '--cat-minor-bg': COLOR.catMinorBg,
  '--cat-chore': COLOR.catChore,
  '--cat-chore-bg': COLOR.catChoreBg,
  '--cat-growth': COLOR.catGrowth,
  '--cat-growth-bg': COLOR.catGrowthBg,
  '--cat-leisure': COLOR.catLeisure,
  '--cat-leisure-bg': COLOR.catLeisureBg,
  '--cat-sleep': COLOR.catSleep,
  '--cat-sleep-bg': COLOR.catSleepBg,
  /* 字体 */
  '--font-display': FONT.display,
  '--font-ui': FONT.ui,
  '--font-mono': FONT.mono,
  /* 几何 */
  '--radius-s': RADIUS.s,
  '--radius-m': RADIUS.m,
} as const

/** 饮食标签颜色映射（标签 key → 颜色 hex 值） */
export const DIET_TAG_COLORS: Record<string, string> = {
  protein: COLOR.tagDietProtein,
  staple: COLOR.tagDietStaple,
  vegetable: COLOR.tagDietVegetable,
  fruit: COLOR.tagDietFruit,
  caffeine: COLOR.tagDietCaffeine,
  sugar: COLOR.tagDietSugar,
  alcohol: COLOR.tagDietAlcohol,
  fried: COLOR.tagDietFried,
}

/** 卫生活动颜色映射 */
export const HYGIENE_COLORS: Record<string, string> = {
  shower: COLOR.tagHygieneShower,
  brush_teeth: COLOR.tagHygieneBrushTeeth,
  skincare: COLOR.tagHygieneSkincare,
  shave: COLOR.tagHygieneShave,
  hair_wash: COLOR.tagHygieneHairWash,
  nail_care: COLOR.tagHygieneNailCare,
}

/** 时段颜色映射 */
export const PERIOD_COLORS: Record<string, string> = {
  morning: COLOR.tagPeriodMorning,
  noon: COLOR.tagPeriodNoon,
  afternoon: COLOR.tagPeriodAfternoon,
  evening: COLOR.tagPeriodEvening,
  night: COLOR.tagPeriodNight,
}
