import type { EventColor } from './event'

export type CategoryId = EventColor

export interface CategoryName {
  zh: string
  en: string
}

export interface Category {
  id: CategoryId
  name: CategoryName  // 双语对象，用户可改名，上限 CATEGORY_NAME_MAX_LENGTH 字符
  color: EventColor   // 固定，与 id 同值（id 与 color 一一对应）
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'accent', name: { zh: '核心工作', en: 'Core Work'       }, color: 'accent' },
  { id: 'sage',   name: { zh: '辅助工作', en: 'Support Work'    }, color: 'sage'   },
  { id: 'sand',   name: { zh: '必要事务', en: 'Essentials'      }, color: 'sand'   },
  { id: 'sky',    name: { zh: '阅读学习', en: 'Reading & Study' }, color: 'sky'    },
  { id: 'rose',   name: { zh: '休息',     en: 'Rest'            }, color: 'rose'   },
  { id: 'stone',  name: { zh: '其他',     en: 'Other'           }, color: 'stone'  },
] as const

export const CATEGORY_NAME_MAX_LENGTH = 20
