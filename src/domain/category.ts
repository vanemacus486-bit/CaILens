import type { EventColor } from './event'

export type CategoryId = 'accent' | 'sage' | 'sand' | 'sky' | 'rose' | 'stone'

export type CategoryName = string

export interface KeywordFolder {
  id: string       // unique within the category
  name: string     // user-editable folder name
  keywords: readonly string[]
}

export interface Category {
  id: CategoryId
  name: CategoryName
  color: EventColor
  weeklyBudget: number
  folders: KeywordFolder[]
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'accent', name: '主要矛盾', color: 'accent', weeklyBudget: 20, folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sage',   name: '次要矛盾', color: 'sage',   weeklyBudget: 10, folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sand',   name: '庶务时间', color: 'sand',   weeklyBudget: 5,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'sky',    name: '个人提升', color: 'sky',    weeklyBudget: 5,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'rose',   name: '休息娱乐', color: 'rose',   weeklyBudget: 5,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
  { id: 'stone',  name: '睡眠时长', color: 'stone',  weeklyBudget: 3,  folders: [{ id: 'default', name: '默认', keywords: [] }] },
] as const

export const CATEGORY_NAME_MAX_LENGTH = 20
export const MIN_KEYWORD_LENGTH = 2

export type AddKeywordResult =
  | { ok: true; keywords: string[] }
  | { ok: false; reason: 'too-short' | 'duplicate' }

/** 尝试将候选词加入关键词列表。返回 AddKeywordResult。 */
export function addKeywordIfValid(
  keywords: readonly string[],
  candidate: string,
): AddKeywordResult {
  const trimmed = candidate.trim()
  if (trimmed.length < MIN_KEYWORD_LENGTH) return { ok: false, reason: 'too-short' }
  if (keywords.includes(trimmed)) return { ok: false, reason: 'duplicate' }
  return { ok: true, keywords: [...keywords, trimmed] }
}

/** 按 ID 查找分类 */
export function getCategoryById(
  categories: readonly Category[],
  id: CategoryId,
): Category | undefined {
  return categories.find((c) => c.id === id)
}

/** 在分类中按 folderId 查找文件夹 */
export function findFolder(
  category: Category,
  folderId: string,
): KeywordFolder | undefined {
  return category.folders.find((f) => f.id === folderId)
}

/** 校验 weeklyBudget：必须是 1–168 之间的整数 */
export function validateWeeklyBudget(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 168
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
