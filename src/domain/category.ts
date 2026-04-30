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
  folders: KeywordFolder[]
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'accent', name: { zh: '核心工作', en: 'Core Work'       }, color: 'accent', folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sage',   name: { zh: '辅助工作', en: 'Support Work'    }, color: 'sage',   folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sand',   name: { zh: '必要事务', en: 'Essentials'      }, color: 'sand',   folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sky',    name: { zh: '阅读学习', en: 'Reading & Study' }, color: 'sky',    folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'rose',   name: { zh: '休息',     en: 'Rest'            }, color: 'rose',   folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'stone',  name: { zh: '其他',     en: 'Other'           }, color: 'stone',  folders: [{ id: 'default', name: '默认', keywords: [] }] },
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
