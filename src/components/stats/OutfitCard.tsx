/**
 * # OutfitCard — 穿搭卡片
 *
 * 展示每日穿搭记录。按周分组的卡片流，每格显示当日穿搭简述。
 * 数据来自 DailyOutfit 记录（需从 dailyContextStore 加载）。
 */

import { useMemo } from 'react'
import { format, subDays, startOfWeek, addDays } from 'date-fns'
import type { DailyOutfit } from '@/domain/dailyContext'
import type { AppLanguage } from '@/domain/settings'

interface Props {
  outfits: DailyOutfit[]
  language: AppLanguage
}

// ── 辅助 ──────────────────────────────────────────────────

function getWeekId(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return format(monday, 'yyyy-MM-dd')
}

function dateLabel(dateStr: string, language: AppLanguage): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  const names = language === 'zh'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${format(d, 'MM/dd')} ${names[dow]}`
}

function outfitSummary(outfit: DailyOutfit): string {
  return outfit.items.map((item) => item.label).join(' · ')
}

// ── 组件 ──────────────────────────────────────────────────

export function OutfitCard({ outfits, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720

  // 按周分组
  const weeklyOutfits = useMemo(() => {
    const grouped = new Map<string, DailyOutfit[]>()

    // 最近 2 周
    const now = new Date()
    for (let i = 0; i < 14; i++) {
      const day = subDays(now, i)
      const wk = getWeekId(day)
      if (!grouped.has(wk)) grouped.set(wk, [])
    }

    for (const outfit of outfits) {
      const wk = getWeekId(new Date(outfit.date + 'T00:00:00'))
      const list = grouped.get(wk) ?? []
      list.push(outfit)
      grouped.set(wk, list)
    }

    // 按日期排序
    for (const [wk, list] of grouped) {
      grouped.set(
        wk,
        list.sort((a, b) => b.date.localeCompare(a.date)),
      )
    }

    return Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [outfits])

  // 统计
  const stats = useMemo(() => {
    const uniqueOutfits = outfits.length
    const uniqueItems = new Set(outfits.flatMap((o) => o.items.map((i) => i.label)))
    const topItem = [...uniqueItems].sort(
      (a, b) =>
        outfits.filter((o) => o.items.some((i) => i.label === b)).length -
        outfits.filter((o) => o.items.some((i) => i.label === a)).length,
    )[0]

    const noteCount = outfits.filter((o) => o.note).length

    return { uniqueOutfits, uniqueItemsCount: uniqueItems.size, topItem, noteCount }
  }, [outfits])

  return (
    <div className="outfit-root">
      <style>{OUTFIT_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="outfit-header">
        <span className="outfit-header-icon">👔</span>
        <span className="outfit-header-title">{t('穿搭记录', 'Outfit Log')}</span>
      </div>

      {/* ── 周卡片流 ──────────────────────────── */}
      <div className={`outfit-weeks${isCompact ? ' outfit-weeks-compact' : ''}`}>
        {weeklyOutfits.map(([weekId, dayOutfits]) => {
          const weekStart = new Date(weekId + 'T00:00:00')

          // 本周七天填充
          const dayMap = new Map<string, DailyOutfit>()
          for (const o of dayOutfits) dayMap.set(o.date, o)

          return (
            <div key={weekId} className="outfit-week">
              <div className="outfit-week-label">
                {t('周 ', 'Week ')}{format(weekStart, 'M/d')}
              </div>
              <div className="outfit-week-grid">
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = addDays(weekStart, i)
                  const dayStr = format(day, 'yyyy-MM-dd')
                  const outfit = dayMap.get(dayStr)
                  const isFuture = day > new Date()

                  return (
                    <div
                      key={i}
                      className={`outfit-day-cell${!outfit ? ' outfit-day-empty' : ''}${isFuture ? ' outfit-day-future' : ''}`}
                    >
                      <div className="outfit-day-label">{dateLabel(dayStr, language)}</div>
                      {outfit ? (
                        <div className="outfit-day-content">
                          <span className="outfit-day-text">{outfitSummary(outfit)}</span>
                          {outfit.note && (
                            <span className="outfit-day-note">{outfit.note}</span>
                          )}
                        </div>
                      ) : (
                        <span className="outfit-day-placeholder">
                          {t('未记录', '—')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 穿搭统计 ──────────────────────────── */}
      <div className="outfit-stats">
        <div className="outfit-stat">
          <span className="outfit-stat-num">{stats.uniqueOutfits}</span>
          <span className="outfit-stat-label">{t('记录', 'Logs')}</span>
        </div>
        <div className="outfit-stat">
          <span className="outfit-stat-num">{stats.uniqueItemsCount}</span>
          <span className="outfit-stat-label">{t('单品', 'Items')}</span>
        </div>
        {stats.topItem && (
          <div className="outfit-stat">
            <span className="outfit-stat-num">{stats.topItem}</span>
            <span className="outfit-stat-label">{t('高频单品', 'Most Worn')}</span>
          </div>
        )}
        <div className="outfit-stat">
          <span className="outfit-stat-num">{stats.noteCount}</span>
          <span className="outfit-stat-label">{t('备注', 'Notes')}</span>
        </div>
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const OUTFIT_CSS = `
.outfit-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.outfit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.outfit-header-icon { font-size: 18px; }
.outfit-header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}

/* ── Week cards ──────────────────────────── */
.outfit-weeks {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}
.outfit-week {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--heatmap-rule);
}
.outfit-week-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  margin-bottom: 10px;
}
.outfit-week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
@media (max-width: 719px) {
  .outfit-week-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.outfit-day-cell {
  background: var(--heatmap-bg);
  border-radius: 6px;
  padding: 8px;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--heatmap-rule);
}
.outfit-day-empty {
  opacity: 0.5;
}
.outfit-day-future {
  opacity: 0.2;
}
.outfit-day-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--heatmap-ink-3);
}
.outfit-day-text {
  font-size: 11px;
  color: var(--heatmap-ink-1);
  line-height: 1.4;
  word-break: break-all;
}
.outfit-day-placeholder {
  font-size: 11px;
  color: var(--heatmap-ink-3);
}
.outfit-day-note {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  font-style: italic;
  display: block;
  margin-top: 2px;
}
.outfit-day-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* ── Stats ──────────────────────────────── */
.outfit-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.outfit-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
  background: var(--heatmap-bg-card);
  padding: 8px 12px;
  border-radius: 6px;
}
.outfit-stat-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.outfit-stat-label {
  font-size: 11px;
  color: var(--heatmap-ink-3);
}
`