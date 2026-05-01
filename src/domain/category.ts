import type { EventColor } from './event'

export type CategoryId = EventColor

export interface CategoryName {
  zh: string
  en: string
}

export interface KeywordFolder {
  id: string       // unique within the category
  name: string     // user-editable folder name
  keywords: string[]
}

export interface Category {
  id: CategoryId
  name: CategoryName
  color: EventColor
  weeklyBudget: number
  folders: KeywordFolder[]
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'accent', name: { zh: '主要矛盾', en: 'Core Focus'        }, color: 'accent', weeklyBudget: 20, folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sage',   name: { zh: '次要矛盾', en: 'Support Tasks'     }, color: 'sage',   weeklyBudget: 10, folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sand',   name: { zh: '庶务时间', en: 'Chores & Admin'    }, color: 'sand',   weeklyBudget: 5,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sky',    name: { zh: '个人提升', en: 'Personal Growth'   }, color: 'sky',    weeklyBudget: 5,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'rose',   name: { zh: '休息娱乐', en: 'Rest & Leisure'    }, color: 'rose',   weeklyBudget: 5,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'stone',  name: { zh: '睡眠时长', en: 'Sleep'             }, color: 'stone',  weeklyBudget: 3,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
] as const

export const CATEGORY_NAME_MAX_LENGTH = 20
export const MIN_KEYWORD_LENGTH = 2

/** 尝试将候选词加入关键词列表。返回新数组或 null（无需/不能添加时）。 */
export function addKeywordIfValid(
  keywords: readonly string[],
  candidate: string,
): string[] | null {
  const trimmed = candidate.trim()
  if (trimmed.length < MIN_KEYWORD_LENGTH) return null
  if (keywords.includes(trimmed)) return null
  return [...keywords, trimmed]
}

/** 折叠所有文件夹的关键词为一个去重数组 */
export function flattenFolderKeywords(folders: readonly KeywordFolder[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const f of folders) {
    for (const kw of f.keywords) {
      if (!seen.has(kw)) { seen.add(kw); result.push(kw) }
    }
  }
  return result
}
