/**
 * # NormalizePanel — 命名整理面板
 *
 * 复盘页「命名整理」Tab 的主组件。
 * 自动发现相似但不一致的标题，分组展示，支持批量统一命名。
 */

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Loader2, Check, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
// stores
import { fireAndForget } from '@/lib/fireAndForget'
import { computeTitleClusters, computeLowFrequencyTitles } from '@/domain/titleCluster'
import type { TitleCluster, LowFrequencyTitle } from '@/domain/titleCluster'
import type { CategoryId } from '@/domain/category'
import { CATEGORY_LABELS } from './categoryLabels'

// ── Props ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NormalizePanelProps {
}

// ── 颜色映射 ─────────────────────────────────────────────

const CAT_ORDER: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

// ── 组件 ──────────────────────────────────────────────────

export function NormalizePanel({}: NormalizePanelProps) {

  const allEvents        = useEventStore((s) => s.allEvents)
  const loadAllEvents    = useEventStore((s) => s.loadAllEvents)
  const bulkRenameEvents = useEventStore((s) => s.bulkRenameEvents)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // 加载全部事件
  useEffect(() => {
    if (allEvents.length === 0) {
      fireAndForget(loadAllEvents(), 'load all events for normalize')
    }
  }, [allEvents.length, loadAllEvents])

  // ── 分类筛选 ────────────────────────────────────────────

  const [selectedCat, setSelectedCat] = useState<CategoryId | null>(null)
  // ── 计算聚类 ────────────────────────────────────────────

  const clustersByCat = useMemo(() => {
    if (allEvents.length === 0) return null
    return computeTitleClusters(allEvents)
  }, [allEvents])

  // 当前分类下的簇
  const currentClusters = useMemo<TitleCluster[]>(() => {
    if (!clustersByCat) return []
    if (!selectedCat) {
      // 全部：展平所有分类的簇，按事件数排序
      const all: TitleCluster[] = []
      for (const cat of CAT_ORDER) {
        const catClusters = clustersByCat[cat]
        if (catClusters) all.push(...catClusters)
      }
      all.sort((a, b) => b.totalEvents - a.totalEvents)
      return all
    }
    return clustersByCat[selectedCat] ?? []
  }, [clustersByCat, selectedCat])

  // ── 计算低频孤立标题 ────────────────────────────────────

  const lowFreqByCat = useMemo(() => {
    if (allEvents.length === 0) return null
    const all = computeLowFrequencyTitles(allEvents)
    // 按分类分组
    const byCat = new Map<CategoryId, LowFrequencyTitle[]>()
    for (const item of all) {
      const list = byCat.get(item.categoryId) ?? []
      list.push(item)
      byCat.set(item.categoryId, list)
    }
    return byCat
  }, [allEvents])

  // 当前分类下的低频标题
  const currentLowFreq = useMemo<LowFrequencyTitle[]>(() => {
    if (!lowFreqByCat) return []
    if (!selectedCat) {
      const all: LowFrequencyTitle[] = []
      for (const cat of CAT_ORDER) {
        const items = lowFreqByCat.get(cat)
        if (items) all.push(...items)
      }
      return all
    }
    return lowFreqByCat.get(selectedCat) ?? []
  }, [lowFreqByCat, selectedCat])

  // 每个分类发现的问题总数（聚类簇数 + 低频项数，用于 badges）
  const issueCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CAT_ORDER) {
      let total = 0
      // 簇数
      total += clustersByCat?.[cat]?.length ?? 0
      // 低频项数
      total += lowFreqByCat?.get(cat)?.length ?? 0
      counts[cat] = total
    }
    return counts
  }, [clustersByCat, lowFreqByCat])

  // ── 每个簇的本地状态 ────────────────────────────────────

  const [canonicalTitles, setCanonicalTitles] = useState<Record<string, string>>({})
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({})
  const [applyingClusters, setApplyingClusters] = useState<Record<string, boolean>>({})
  const [appliedClusters, setAppliedClusters] = useState<Set<string>>(new Set())
  const [snackbar, setSnackbar] = useState<string | null>(null)
  // ── 低频标题的重命名状态 ───────────────────────────────

  // 每个低频标题要改成的目标名称（key = lowFreqKey(item)）
  const [lowFreqTargets, setLowFreqTargets] = useState<Record<string, string>>({})
  const [applyingLowFreq, setApplyingLowFreq] = useState<Record<string, boolean>>({})
  const [appliedLowFreq, setAppliedLowFreq] = useState<Set<string>>(new Set())

  // 当低频数据变化时，初始化目标名称（优先用建议值）
  useEffect(() => {
    const defaults: Record<string, string> = {}
    for (const item of currentLowFreq) {
      const key = lowFreqKey(item)
      defaults[key] = item.suggestion ?? item.title
    }
    setLowFreqTargets((prev) => ({ ...defaults, ...prev }))
  }, [currentLowFreq])

  // 当聚类数据变化时，重置规范名称
  useEffect(() => {
    const defaults: Record<string, string> = {}
    for (const cluster of currentClusters) {
      // 用簇的唯一键
      const key = clusterKey(cluster)
      defaults[key] = cluster.canonicalTitle
    }
    setCanonicalTitles((prev) => ({ ...defaults, ...prev }))
  }, [currentClusters])

  // ── 处理函数 ────────────────────────────────────────────

  const handleSetCanonical = useCallback(
    (cluster: TitleCluster, title: string) => {
      const key = clusterKey(cluster)
      setCanonicalTitles((prev) => ({ ...prev, [key]: title }))
    },
    [],
  )

  const handleToggleExpand = useCallback((key: string) => {
    setExpandedClusters((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleApply = useCallback(
    async (cluster: TitleCluster) => {
      const key = clusterKey(cluster)
      if (applyingClusters[key] || appliedClusters.has(key)) return

      const canonical = canonicalTitles[key]
      if (!canonical || !canonical.trim()) return

      setApplyingClusters((prev) => ({ ...prev, [key]: true }))

      // 收集需要重命名的事件（排除已经是规范名称的）
      const updates: { id: string; title: string }[] = []
      for (const variant of cluster.variants) {
        if (variant.title === canonical) continue // 已是规范名
        for (const eventId of variant.eventIds) {
          // 确认事件确实有不是规范名的 title（用 allEvents 查）
          updates.push({ id: eventId, title: canonical.trim() })
        }
      }

      if (updates.length === 0) {
        setSnackbar('无需修改')
        setApplyingClusters((prev) => ({ ...prev, [key]: false }))
        return
      }

      try {
        await bulkRenameEvents(updates)
        setAppliedClusters((prev) => new Set(prev).add(key))
        setSnackbar(
          `已统一 ${updates.length} 条事件`,
        )
      } catch {
        setSnackbar('重命名失败')
      } finally {
        setApplyingClusters((prev) => ({ ...prev, [key]: false }))
      }
    },
    [bulkRenameEvents, canonicalTitles, appliedClusters, applyingClusters],
  )

  // ── 低频重命名处理 ─────────────────────────────────────

  const handleLowFreqApply = useCallback(
    async (item: LowFrequencyTitle) => {
      const key = lowFreqKey(item)
      if (applyingLowFreq[key] || appliedLowFreq.has(key)) return

      const target = lowFreqTargets[key]
      if (!target || !target.trim() || target === item.title) {
        setSnackbar('无需修改')
        return
      }

      setApplyingLowFreq((prev) => ({ ...prev, [key]: true }))

      const updates = item.eventIds.map((id) => ({ id, title: target.trim() }))

      try {
        await bulkRenameEvents(updates)
        setAppliedLowFreq((prev) => new Set(prev).add(key))
        setSnackbar(
          `已重命名 ${updates.length} 条事件`,
        )
      } catch {
        setSnackbar('重命名失败')
      } finally {
        setApplyingLowFreq((prev) => ({ ...prev, [key]: false }))
      }
    },
    [bulkRenameEvents, lowFreqTargets, applyingLowFreq, appliedLowFreq],
  )

  // ── 空状态 ──────────────────────────────────────────────

  if (allEvents.length === 0) {
    return (
      <div className="normalize-loading">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        <p>{'加载事件中…'}</p>
      </div>
    )
  }

  const hasClusters = currentClusters.length > 0

  return (
    <div className="normalize-panel">
      <style>{NORMALIZE_CSS}</style>

      {/* 说明文字 */}
      <p className="normalize-description">
        {t(
          '自动发现命名不一致的相似事件，选定规范名称后批量统一，便于后续统计和分析。',
          'Find similar events with inconsistent names, pick a canonical name, and normalize them in batch for cleaner stats.',
        )}
      </p>

      {/* ── 分类筛选 pills ──────────────────────────────── */}
      <div className="normalize-pills">
        <button
          className={`normalize-pill${selectedCat === null ? ' normalize-pill-active' : ''}`}
          onClick={() => setSelectedCat(null)}
        >
          {'全部'}
        </button>
        {CAT_ORDER.map((catId) => {
          const label = CATEGORY_LABELS[catId]
          const count = issueCounts[catId] ?? 0
          return (
            <button
              key={catId}
              className={`normalize-pill${selectedCat === catId ? ' normalize-pill-active' : ''}`}
              onClick={() => setSelectedCat(catId)}
              data-cat={catId}
            >
              <span
                className="normalize-pill-dot"
                style={{ backgroundColor: `var(--event-${catId}-text)` }}
              />
              {label.zh}
              {count > 0 && <span className="normalize-pill-badge">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* ── 簇列表 ──────────────────────────────────────── */}
      {!hasClusters && currentLowFreq.length === 0 && (
        <div className="normalize-empty">
          <p className="normalize-empty-text">
            {selectedCat
              ? '该分类下没有发现命名不一致的事件 🎉'
              : ''}
          </p>
        </div>
      )}

      <div className="normalize-clusters">
        {currentClusters.map((cluster) => {
          const key = clusterKey(cluster)
          const canonical = canonicalTitles[key] ?? cluster.canonicalTitle
          const isApplying = applyingClusters[key] ?? false
          const isApplied = appliedClusters.has(key)
          const isExpanded = expandedClusters[key] ?? false
          const catLabel = CATEGORY_LABELS[cluster.categoryId]
          const catName = catLabel.zh
          return (
            <div key={cluster.categoryId + cluster.canonicalTitle} className="normalize-card">
              <div className="normalize-card-header">
                <span
                  className="normalize-card-dot"
                  style={{ backgroundColor: `var(--event-${cluster.categoryId}-text)` }}
                />
                <span className="normalize-card-cat">{catName}</span>
                <input
                  className="normalize-canonical-input"
                  value={canonical}
                  onChange={(e) => handleSetCanonical(cluster, e.target.value)}
                  placeholder={'输入规范名称…'}
                  disabled={isApplied}
                />
                <span className="normalize-card-count">
                  {`统一 ${cluster.totalEvents} 条`}
                </span>
                {isApplied && (
                  <span className="normalize-applied-badge">
                    <Check size={14} />
                    {'已应用'}
                  </span>
                )}
              </div>

              {/* 变体列表 */}
              <div className="normalize-variants">
                {cluster.variants.map((v) => {
                  const isCanonical = v.title === canonical
                  return (
                    <div
                      key={v.title}
                      className={`normalize-variant${isCanonical ? ' normalize-variant-canonical' : ''}`}
                    >
                      <span className="normalize-variant-title">
                        {v.title}
                        {isCanonical && (
                          <span className="normalize-canonical-tag">
                            {'规范'}
                          </span>
                        )}
                      </span>
                      <span className="normalize-variant-count">
                        {`${v.count} 次`}
                      </span>
                      {!isCanonical && !isApplied && (
                        <button
                          className="normalize-set-btn"
                          onClick={() => handleSetCanonical(cluster, v.title)}
                        >
                          {'设规范'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 展开查看具体事件 */}
              {isExpanded && (
                <div className="normalize-event-list">
                  {cluster.variants.map((v) => (
                    <div key={v.title} className="normalize-event-group">
                      <p className="normalize-event-group-title">
                        {v.title}
                        <span className="normalize-event-group-count">
                          {`${v.count} 条`}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="normalize-card-actions">
                <button
                  className="normalize-expand-btn"
                  onClick={() => handleToggleExpand(key)}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {isExpanded
                    ? '收起事件'
                    : '展开事件'}
                </button>

                <button
                  className="normalize-apply-btn"
                  onClick={() => handleApply(cluster)}
                  disabled={isApplying || isApplied || !canonical.trim()}
                >
                  {isApplying
                    ? '应用中…'
                    : isApplied
                      ? '已应用 ✓'
                      : '应用'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 低频事件提醒 ─────────────────────────────────── */}
      {currentLowFreq.length > 0 && (
        <div className="normalize-lowfreq">
          <div className="normalize-lowfreq-header">
            <AlertTriangle size={16} className="normalize-lowfreq-icon" />
            <h3 className="normalize-lowfreq-title">
              {'低频事件提醒'}
            </h3>
            <span className="normalize-lowfreq-count">
              {`${currentLowFreq.length} 项`}
            </span>
          </div>
          <p className="normalize-lowfreq-desc">
            {t(
              '以下标题仅出现 1-2 次，可能是笔误或一次性事件。如有必要，可合并到已有名称。',
              'These titles appear only 1-2 times — possible typos or one-off events. Merge them into an existing name if needed.',
            )}
          </p>

          <div className="normalize-lowfreq-list">
            {currentLowFreq.map((item) => {
              const key = lowFreqKey(item)
              const target = lowFreqTargets[key] ?? ''
              const isApplying = applyingLowFreq[key] ?? false
              const isApplied = appliedLowFreq.has(key)
              return (
                <div
                  key={key}
                  className={`normalize-lowfreq-item${isApplied ? ' normalize-lowfreq-item-applied' : ''}`}
                >
                  {/* 原名 + 次数 */}
                  <div className="normalize-lowfreq-item-row">
                    <span className="normalize-lowfreq-original">{item.title}</span>
                    <span className="normalize-variant-count">
                      {`${item.count} 次`}
                    </span>
                    <span
                      className="normalize-lowfreq-dot"
                      style={{ backgroundColor: `var(--event-${item.categoryId}-text)` }}
                    />
                  </div>

                  {/* 建议 + 输入 */}
                  <div className="normalize-lowfreq-item-row">
                    <span className="normalize-lowfreq-arrow">→</span>
                    <input
                      className="normalize-lowfreq-input"
                      value={target}
                      onChange={(e) => {
                        setLowFreqTargets((prev) => ({ ...prev, [key]: e.target.value }))
                      }}
                      placeholder={'输入目标名称…'}
                      disabled={isApplied}
                    />
                    {item.suggestion && !isApplied && (
                      <button
                        className="normalize-lowfreq-suggestion"
                        onClick={() =>
                          setLowFreqTargets((prev) => ({ ...prev, [key]: item.suggestion! }))
                        }
                      >
                        {`建议: ${item.suggestion}`}
                        <span className="normalize-lowfreq-suggestion-count">
                          {`${item.suggestionCount}x`}
                        </span>
                      </button>
                    )}
                    <button
                      className="normalize-lowfreq-apply"
                      onClick={() => handleLowFreqApply(item)}
                      disabled={isApplying || isApplied || !target.trim() || target === item.title}
                    >
                      {isApplying
                        ? '…'
                        : isApplied
                          ? '✓'
                          : '应用'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar && (
        <div className="normalize-snackbar" onClick={() => setSnackbar(null)}>
          {snackbar}
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────

const NORMALIZE_CSS = `
.normalize-panel {
  max-width: 720px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
}

.normalize-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: var(--text-tertiary);
  font-size: 14px;
}

.normalize-description {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
  line-height: 1.5;
}

/* ── Category pills ───────────────────── */
.normalize-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 20px;
}
.normalize-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle, #e0e0e0);
  background: var(--heatmap-bg-card, #f5f5f5);
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}
.normalize-pill:hover {
  border-color: var(--accent, #f97316);
  color: var(--text-primary);
}
.normalize-pill-active {
  border-color: var(--accent, #f97316);
  background: var(--accent, #f97316);
  color: white;
}
.normalize-pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.normalize-pill-active .normalize-pill-dot {
  background: white !important;
}
.normalize-pill-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(0,0,0,0.1);
  color: inherit;
  margin-left: 2px;
}
.normalize-pill-active .normalize-pill-badge {
  background: rgba(255,255,255,0.25);
}

/* ── Empty state ──────────────────────── */
.normalize-empty {
  text-align: center;
  padding: 40px 0;
}
.normalize-empty-text {
  font-size: 15px;
  color: var(--text-tertiary);
}

/* ── Cluster cards ────────────────────── */
.normalize-clusters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.normalize-card {
  background: var(--heatmap-bg-card, #fafafa);
  border: 1px solid var(--border-subtle, #e8e8e8);
  border-radius: 10px;
  padding: 16px;
  transition: opacity 0.3s ease;
}
.normalize-card-applied {
  opacity: 0.55;
}

/* ── Card header ──────────────────────── */
.normalize-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.normalize-card-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.normalize-card-cat {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.normalize-canonical-input {
  flex: 1;
  min-width: 0;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--surface-sunken, #f0f0f0);
  border: 1px solid var(--border-subtle, #e0e0e0);
  border-radius: 6px;
  padding: 6px 10px;
  outline: none;
  transition: border-color 0.15s ease;
}
.normalize-canonical-input:focus {
  border-color: var(--accent, #f97316);
}
.normalize-canonical-input:disabled {
  opacity: 0.6;
}
.normalize-card-count {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}
.normalize-applied-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-success, #16a34a);
  white-space: nowrap;
}

/* ── Variants list ────────────────────── */
.normalize-variants {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.normalize-variant {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}
.normalize-variant-canonical {
  background: rgba(22, 163, 74, 0.06);
}
.normalize-variant-title {
  flex: 1;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.normalize-canonical-tag {
  font-size: 9px;
  font-weight: 600;
  color: var(--color-text-success, #16a34a);
  background: rgba(22, 163, 74, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
}
.normalize-variant-count {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: monospace;
  flex-shrink: 0;
}
.normalize-set-btn {
  font-size: 10px;
  font-weight: 500;
  color: var(--accent, #f97316);
  background: transparent;
  border: 1px solid var(--accent, #f97316);
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.normalize-set-btn:hover {
  background: var(--accent, #f97316);
  color: white;
}

/* ── Expanded event list ──────────────── */
.normalize-event-list {
  margin-bottom: 12px;
  padding: 8px;
  background: var(--surface-sunken, #f5f5f5);
  border-radius: 6px;
}
.normalize-event-group {
  margin-bottom: 4px;
}
.normalize-event-group-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.normalize-event-group-count {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 400;
}

/* ── Card actions ─────────────────────── */
.normalize-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle, #e8e8e8);
}
.normalize-expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s ease;
}
.normalize-expand-btn:hover {
  color: var(--text-primary);
  background: var(--surface-sunken, #f0f0f0);
}
.normalize-apply-btn {
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: var(--accent, #f97316);
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.normalize-apply-btn:hover:not(:disabled) {
  opacity: 0.85;
}
.normalize-apply-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Low-frequency section ────────────── */
.normalize-lowfreq {
  margin-top: 28px;
  padding: 16px;
  background: var(--heatmap-bg-card, #fafafa);
  border: 1px solid var(--border-subtle, #e8e8e8);
  border-radius: 10px;
}
.normalize-lowfreq-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.normalize-lowfreq-icon {
  color: var(--color-text-warning, #f59e0b);
  flex-shrink: 0;
}
.normalize-lowfreq-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  font-family: 'Noto Sans SC', sans-serif;
}
.normalize-lowfreq-count {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
  font-family: monospace;
}
.normalize-lowfreq-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0 0 12px 24px;
  line-height: 1.4;
}
.normalize-lowfreq-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.normalize-lowfreq-item {
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--surface-sunken, #f5f5f5);
  transition: opacity 0.2s ease;
}
.normalize-lowfreq-item-applied {
  opacity: 0.5;
}
.normalize-lowfreq-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.normalize-lowfreq-item-row:last-child {
  margin-bottom: 0;
}
.normalize-lowfreq-original {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'Noto Sans SC', sans-serif;
}
.normalize-lowfreq-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: auto;
}
.normalize-lowfreq-arrow {
  font-size: 13px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.normalize-lowfreq-input {
  flex: 1;
  min-width: 0;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--surface-base);
  border: 1px solid var(--border-subtle, #e0e0e0);
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  transition: border-color 0.15s ease;
}
.normalize-lowfreq-input:focus {
  border-color: var(--accent, #f97316);
}
.normalize-lowfreq-input:disabled {
  opacity: 0.5;
}
.normalize-lowfreq-suggestion {
  font-size: 10px;
  color: var(--accent, #f97316);
  background: transparent;
  border: 1px solid var(--accent, #f97316);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
}
.normalize-lowfreq-suggestion:hover {
  background: var(--accent, #f97316);
  color: white;
}
.normalize-lowfreq-suggestion-count {
  font-family: monospace;
  font-size: 9px;
  opacity: 0.7;
}
.normalize-lowfreq-apply {
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: var(--accent, #f97316);
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}
.normalize-lowfreq-apply:hover:not(:disabled) {
  opacity: 0.85;
}
.normalize-lowfreq-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Snackbar ─────────────────────────── */
.normalize-snackbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--text-primary);
  color: var(--surface-base);
  font-size: 13px;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: normalize-fade-in 0.2s ease;
}
@keyframes normalize-fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
`

// ── 工具 ──────────────────────────────────────────────────

/** 生成簇的唯一键 */
function clusterKey(cluster: TitleCluster): string {
  // 用所有变体标题排序后取 md5 风格键
  const sorted = cluster.variants.map((v) => v.title).sort().join('||')
  // 简单的哈希
  let hash = 0
  for (let i = 0; i < sorted.length; i++) {
    const ch = sorted.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return `${cluster.categoryId}:${hash}`
}

/** 生成低频标题的唯一键 */
function lowFreqKey(item: LowFrequencyTitle): string {
  const s = `${item.categoryId}:${item.title}`
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return `low:${hash}`
}
