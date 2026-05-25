/**
 * # 事件分类与关键词学习用例
 *
 * 从 eventStore 的 createEvent / updateEvent 中提取的隐式副作用：
 * 当事件有标题且属于某个分类时，尝试将标题作为关键词添加到该分类
 * 的第一个文件夹中，然后触发全量事件重分类。
 *
 * 提取为独立用例后：
 * - 逻辑集中一处，不再在 createEvent/updateEvent 中重复
 * - 纯计算部分（maybeLearnKeyword）可独立单元测试
 * - 副作用（更新分类文件夹、重分类）通过 deps 注入，解耦 store
 */

import { addKeywordIfValid } from '@/domain/category'
import type { Category, CategoryId, KeywordFolder } from '@/domain/category'

// ── 纯计算：判断是否需要学习关键词 ──────────────────────────

/**
 * 检查事件标题是否可以作为关键词添加到对应分类的第一个文件夹。
 * 返回更新后的文件夹数组（仅第一个文件夹的 keywords 可能变化），
 * 若无有效的关键词可学习则返回 null。
 */
export function maybeLearnKeyword(
  title: string,
  categoryId: CategoryId,
  categories: readonly Category[],
): KeywordFolder[] | null {
  if (!title || !categoryId) return null

  const cat = categories.find((c) => c.id === categoryId)
  if (!cat || cat.folders.length === 0) return null

  const first = cat.folders[0]
  const result = addKeywordIfValid(first.keywords, title)
  if (!result.ok) return null
  const updated = result.keywords

  return cat.folders.map((f, i) => (i === 0 ? { ...f, keywords: updated } : f))
}

// ── 依赖注入接口 ────────────────────────────────────────────

export interface LearnKeywordDeps {
  /** 获取当前分类列表 */
  getCategories: () => readonly Category[]
  /** 更新某分类的文件夹 */
  updateCategoryFolders: (id: CategoryId, folders: KeywordFolder[]) => Promise<void>
  /** 重分类所有事件 */
  reclassifyAllEvents: () => Promise<void>
}

// ── 用例入口 ────────────────────────────────────────────────

/**
 * 尝试从事件标题学习关键词，如有新关键词则更新分类文件夹并触发全量重分类。
 * 无副作用当标题不可作为关键词时。
 */
export async function tryLearnAndReclassify(
  title: string,
  categoryId: CategoryId,
  deps: LearnKeywordDeps,
): Promise<void> {
  const categories = deps.getCategories()
  const newFolders = maybeLearnKeyword(title, categoryId, categories)
  if (!newFolders) return

  await deps.updateCategoryFolders(categoryId, newFolders)
  await deps.reclassifyAllEvents()
}
