/**
 * # titleCluster — 事件标题相似度检测与聚类
 *
 * 用于在复盘页「命名整理」Tab 中自动发现命名不一致的同类事件，
 * 辅助用户批量统一命名。
 *
 * ## 算法
 * 1. 归一化：trim、统一全半角、转小写
 * 2. 按分类（categoryId）分组，避免跨类误聚
 * 3. 对同分类下每对标题计算字符级 Jaccard 相似度 + 包含度
 * 4. 超过阈值的标题对用 Union-Find 聚类
 * 5. 每簇建议规范名 = 使用频次最高的标题
 */

import type { CalendarEvent } from './event'
import type { CategoryId } from './category'

// ── 阈值 ──────────────────────────────────────────────────

/** Jaccard 相似度阈值（≥ 此值视为相似） */
const JACCARD_THRESHOLD = 0.35
/** 包含度阈值（短标题字符大多在长标题中） */
const CONTAINMENT_THRESHOLD = 0.65
// (MIN_EVENT_COUNT reserved for future use)

// ── 类型 ──────────────────────────────────────────────────

/** 一个标题变体，含其事件数 */
export interface TitleVariant {
  /** 原始标题文本 */
  title: string
  /** 使用此标题的事件 ID 列表 */
  eventIds: string[]
  /** 使用次数 */
  count: number
}

/** 一个标题簇（相似标题集合） */
export interface TitleCluster {
  /** 建议的规范名称（频次最高者） */
  canonicalTitle: string
  /** 本簇所有变体 */
  variants: TitleVariant[]
  /** 簇内事件总数 */
  totalEvents: number
  /** 所属分类 */
  categoryId: CategoryId
}

/** 完整的聚类结果，按分类分组 */
export type TitleClusterMap = Partial<Record<CategoryId, TitleCluster[]>>

// ── 低频事件类型 ──────────────────────────────────────────

/** 出现次数很少的孤立标题（可能是笔误或一次性事件） */
export interface LowFrequencyTitle {
  /** 原始标题 */
  title: string
  /** 事件 ID 列表 */
  eventIds: string[]
  /** 出现次数（1 或 2） */
  count: number
  /** 所属分类 */
  categoryId: CategoryId
  /** 建议合并到哪个已有标题（同分类下高频且最相似） */
  suggestion: string | null
  /** 建议标题的出现次数 */
  suggestionCount: number
}

// ── 归一化 ────────────────────────────────────────────────

/**
 * 归一化标题用于比较：
 * - trim
 * - 英文字母转小写
 * - 全角字符转半角（字母/数字）
 * - 移除多余空白
 */
function normalize(s: string): string {
  let r = s.trim()
  // 全角字母/数字 → 半角
  r = r.replace(/[\uFF01-\uFF5E]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0),
  )
  r = r.toLowerCase()
  // 压缩空白
  r = r.replace(/\s+/g, ' ')
  return r
}

/** 检查标题是否太短或没意义（跳过空/纯标点/纯空格） */
function isValidTitle(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  // 过滤纯标点/符号
  if (/^[\s\u3000-\u303f\uff00-\uffef\p{P}]+$/u.test(t)) return false
  return true
}

// ── 相似度计算 ────────────────────────────────────────────

/** 取字符串的唯一字符集 */
function charSet(s: string): Set<string> {
  return new Set(s)
}

/**
 * Jaccard 相似度：|A ∩ B| / |A ∪ B|
 * 基于字符级别（适合中文短文本）
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = charSet(a)
  const setB = charSet(b)
  if (setA.size === 0 && setB.size === 0) return 1
  let intersect = 0
  for (const ch of setA) {
    if (setB.has(ch)) intersect++
  }
  const union = new Set([...setA, ...setB]).size
  return intersect / union
}

/**
 * 包含度：短标题有多少字符出现在长标题中
 * 用于处理 "跑步" vs "晨跑" 这类字符级部分重叠
 */
function containmentRatio(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0
  const shorter = a.length <= b.length ? a : b
  const longer  = a.length <= b.length ? b : a
  let shared = 0
  for (const ch of shorter) {
    if (longer.includes(ch)) shared++
  }
  return shared / shorter.length
}

/** 两个归一化标题是否判定为相似 */
function isSimilar(a: string, b: string): boolean {
  if (a === b) return true
  // 一方完全包含另一方（如 "晨跑" ⊂ "早上晨跑"）
  if (a.includes(b) || b.includes(a)) return true
  const j = jaccardSimilarity(a, b)
  if (j >= JACCARD_THRESHOLD) return true
  const c = containmentRatio(a, b)
  if (c >= CONTAINMENT_THRESHOLD) return true
  return false
}

// ── Union-Find ────────────────────────────────────────────

class UnionFind {
  private parent: number[] = []
  private rank: number[] = []

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.rank = new Array(n).fill(0)
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x])
    }
    return this.parent[x]
  }

  union(x: number, y: number): void {
    const px = this.find(x)
    const py = this.find(y)
    if (px === py) return
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px
    } else {
      this.parent[py] = px
      this.rank[px]++
    }
  }
}

// ── 聚类主函数 ────────────────────────────────────────────

/**
 * 从事件列表计算标题聚类。
 *
 * @param events  所有事件
 * @param categoryIds  要考虑的分类列表（不传则全部分类）
 * @returns 按分类分组的标题簇，只包含有多个变体或单变体但需关注的簇
 */
export function computeTitleClusters(
  events: CalendarEvent[],
  categoryIds?: CategoryId[],
): TitleClusterMap {
  const ids = categoryIds ?? (['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as CategoryId[])
  const result: TitleClusterMap = {}

  for (const catId of ids) {
    const catEvents = events.filter((e) => e.categoryId === catId && isValidTitle(e.title))
    if (catEvents.length < 2) continue

    // 按归一化标题分组统计
    const titleMap = new Map<string, string[]>() // normalized → [original, ...]
    const normToTitle = new Map<string, string>()  // normalized → most frequent original
    const titleEventIds = new Map<string, string[]>() // normalized → event ids
    const freq = new Map<string, number>()

    for (const ev of catEvents) {
      const norm = normalize(ev.title)
      if (!norm) continue
      if (!titleMap.has(norm)) titleMap.set(norm, [])
      titleMap.get(norm)!.push(ev.title)
      freq.set(norm, (freq.get(norm) ?? 0) + 1)
      if (!titleEventIds.has(norm)) titleEventIds.set(norm, [])
      titleEventIds.get(norm)!.push(ev.id)
    }

    // 取每个归一化标题的最常见原始形式
    for (const [norm, originals] of titleMap) {
      const count = new Map<string, number>()
      for (const o of originals) count.set(o, (count.get(o) ?? 0) + 1)
      const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0]
      normToTitle.set(norm, best)
    }

    const norms = [...titleMap.keys()]
    if (norms.length < 2) continue

    // 构建相似图
    const uf = new UnionFind(norms.length)
    for (let i = 0; i < norms.length; i++) {
      for (let j = i + 1; j < norms.length; j++) {
        if (isSimilar(norms[i], norms[j])) {
          uf.union(i, j)
        }
      }
    }

    // 按簇分组
    const clusterMap = new Map<number, string[]>() // root → [norm, ...]
    for (let i = 0; i < norms.length; i++) {
      const root = uf.find(i)
      if (!clusterMap.has(root)) clusterMap.set(root, [])
      clusterMap.get(root)!.push(norms[i])
    }

    // 构建 TitleCluster[]
    const clusters: TitleCluster[] = []
    for (const [, group] of clusterMap) {
      if (group.length < 2) continue // 只有孤立的标题，没有不一致

      const variants: TitleVariant[] = group.map((norm) => ({
        title: normToTitle.get(norm)!,
        eventIds: titleEventIds.get(norm)!,
        count: freq.get(norm)!,
      }))

      // 按频次降序
      variants.sort((a, b) => b.count - a.count)

      const totalEvents = variants.reduce((s, v) => s + v.count, 0)
      if (totalEvents < 2) continue

      clusters.push({
        canonicalTitle: variants[0].title, // 最常见标题作为建议规范名
        variants,
        totalEvents,
        categoryId: catId,
      })
    }

    if (clusters.length > 0) {
      // 按事件总数降序排列（最值得处理的排前面）
      clusters.sort((a, b) => b.totalEvents - a.totalEvents)
      result[catId] = clusters
    }
  }

  return result
}

/**
 * 计算低频孤立标题（出现 ≤ 2 次且不与任何其他标题相似），
 * 并为每个标题建议一个最近的高频标题（≥ 3 次）供参考。
 */
export function computeLowFrequencyTitles(
  events: CalendarEvent[],
  categoryIds?: CategoryId[],
): LowFrequencyTitle[] {
  const ids = categoryIds ?? (['accent', 'sage', 'sand', 'sky', 'rose', 'stone'] as CategoryId[])
  const result: LowFrequencyTitle[] = []

  for (const catId of ids) {
    const catEvents = events.filter((e) => e.categoryId === catId && isValidTitle(e.title))
    if (catEvents.length < 2) continue

    // 统计频次
    const freq = new Map<string, number>()
    const eventIdsMap = new Map<string, string[]>()
    for (const ev of catEvents) {
      const t = ev.title.trim()
      if (!t) continue
      if (!eventIdsMap.has(t)) eventIdsMap.set(t, [])
      eventIdsMap.get(t)!.push(ev.id)
      freq.set(t, (freq.get(t) ?? 0) + 1)
    }

    const titles = [...freq.keys()]
    // 高频池（供建议用）
    const highFreq = titles.filter((t) => (freq.get(t) ?? 0) >= 3)
    // 低候选
    const lowCandidates = titles.filter((t) => (freq.get(t) ?? 0) <= 2)

    for (const low of lowCandidates) {
      const normLow = normalize(low)
      let isOrphan = true
      let bestMatch: string | null = null
      let bestScore = 0
      let bestFreq = 0

      for (const other of titles) {
        if (other === low) continue
        const normOther = normalize(other)

        // 如果与任何标题相似，则不是孤立
        if (isSimilar(normLow, normOther)) {
          isOrphan = false
          break
        }

        // 仅从高频池找建议
        if (!highFreq.includes(other)) continue
        const score = jaccardSimilarity(normLow, normOther)
        const containment = containmentRatio(normLow, normOther)
        const combined = Math.max(score, containment)
        if (combined > bestScore) {
          bestScore = combined
          bestMatch = other
          bestFreq = freq.get(other) ?? 0
        }
      }

      if (isOrphan) {
        result.push({
          title: low,
          eventIds: eventIdsMap.get(low)!,
          count: freq.get(low)!,
          categoryId: catId,
          suggestion: bestScore > 0.1 ? bestMatch : null,
          suggestionCount: bestMatch ? bestFreq : 0,
        })
      }
    }
  }

  // 排序：先按分类，再按出现次数升序（最少的排前面）
  result.sort((a, b) => {
    if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId)
    return a.count - b.count
  })

  return result
}

/**
 * 获取单个分类下的所有事件标题频次统计（用于 NormalizePanel 的分类筛选概览）
 */
export function getTitleFrequency(
  events: CalendarEvent[],
  categoryId: CategoryId,
): Map<string, number> {
  const freq = new Map<string, number>()
  for (const e of events) {
    if (e.categoryId !== categoryId) continue
    if (!isValidTitle(e.title)) continue
    const t = e.title.trim()
    freq.set(t, (freq.get(t) ?? 0) + 1)
  }
  return freq
}
