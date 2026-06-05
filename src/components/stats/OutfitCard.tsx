/**
 * # OutfitCard — 穿搭卡片
 *
 * 展示每日穿搭记录。按周分组的卡片流，每格显示当日穿搭简述。
 * 新增记录面板：选择日期 → 添加单品（类别+描述）→ 可选备注 → 保存。
 */

import { useState, useMemo, useCallback } from 'react'
import { format, subDays, startOfWeek, addDays } from 'date-fns'
import type { DailyOutfit, OutfitCategory, OutfitItem } from '@/domain/dailyContext'
import type { AppLanguage } from '@/domain/settings'
import { useDailyContextStore } from '@/stores/dailyContextStore'

interface Props {
  outfits: DailyOutfit[]
  language: AppLanguage
}

// ── 常量 ──────────────────────────────────────────────────

const CATEGORY_OPTIONS: { id: OutfitCategory; label: string }[] = [
  { id: 'top',       label: '上装' },
  { id: 'bottom',    label: '下装' },
  { id: 'shoes',     label: '鞋' },
  { id: 'accessory', label: '配饰' },
]

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
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720

  const saveOutfit  = useDailyContextStore((s) => s.saveOutfit)
  const loadOutfits = useDailyContextStore((s) => s.loadOutfits)

  // ── 记录面板状态 ─────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordDate, setRecordDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [items, setItems] = useState<OutfitItem[]>([])
  const [itemCategory, setItemCategory] = useState<OutfitCategory>('top')
  const [itemLabel, setItemLabel] = useState('')
  const [note, setNote] = useState('')

  // 按周分组
  const weeklyOutfits = useMemo(() => {
    const grouped = new Map<string, DailyOutfit[]>()

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

  // ── 保存与取消 ────────────────────────────
  const addItem = useCallback(() => {
    const label = itemLabel.trim()
    if (!label) return
    setItems((prev) => [...prev, { category: itemCategory, label }])
    setItemLabel('')
    setItemCategory('top')
  }, [itemCategory, itemLabel])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = useCallback(async () => {
    if (items.length === 0) return
    await saveOutfit({ date: recordDate, items, note: note.trim() || undefined })
    const end = format(new Date(), 'yyyy-MM-dd')
    const start = format(subDays(new Date(), 60), 'yyyy-MM-dd')
    await loadOutfits(start, end)
    setIsRecording(false)
    setItems([])
    setNote('')
    setItemLabel('')
    setItemCategory('top')
  }, [items, recordDate, note, saveOutfit, loadOutfits])

  const handleCancel = useCallback(() => {
    setIsRecording(false)
    setItems([])
    setNote('')
    setItemLabel('')
    setItemCategory('top')
    setRecordDate(format(new Date(), 'yyyy-MM-dd'))
  }, [])

  // ── 键盘事件（Add item on Enter） ─────────
  const handleItemKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addItem()
    }
  }, [addItem])

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="outfit-root">
      <style>{OUTFIT_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="outfit-header">
        <span className="outfit-header-icon">👔</span>
        <span className="outfit-header-title">{'穿搭记录'}</span>
        <div className="outfit-header-actions">
          {!isRecording && (
            <button
              className="outfit-record-btn"
              onClick={() => { setItems([]); setNote(''); setIsRecording(true) }}
            >
              {'记录'}
            </button>
          )}
        </div>
      </div>

      {/* ── 记录面板 ──────────────────────────── */}
      {isRecording && (
        <div className="outfit-recording">
          <div className="outfit-recording-title">{'记录穿搭'}</div>

          {/* 日期 */}
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="outfit-date-input"
          />

          {/* 单品添加 */}
          <div className="outfit-item-add-row">
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value as OutfitCategory)}
              className="outfit-category-select"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
              onKeyDown={handleItemKeyDown}
              placeholder={'输入单品描述'}
              className="outfit-item-input"
            />
            <button
              onClick={addItem}
              disabled={!itemLabel.trim()}
              className="outfit-add-btn"
            >
              {'+'}
            </button>
          </div>

          {/* 已添加单品 */}
          {items.length > 0 && (
            <div className="outfit-item-list">
              {items.map((item, i) => {
                const catLabel = CATEGORY_OPTIONS.find((opt) => opt.id === item.category)?.label ?? item.category
                return (
                  <span key={i} className="outfit-item-tag" onClick={() => removeItem(i)}>
                    <span className="outfit-item-tag-cat">{catLabel}</span>
                    <span>{item.label}</span>
                    <span className="outfit-item-tag-remove">&times;</span>
                  </span>
                )
              })}
            </div>
          )}

          {/* 备注 */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={'备注（可选）'}
            className="outfit-note-input"
          />

          {/* 操作按钮 */}
          <div className="outfit-recording-actions">
            <button
              className="outfit-save-btn"
              onClick={handleSave}
              disabled={items.length === 0}
            >
              {'保存'}
            </button>
            <button className="outfit-cancel-btn" onClick={handleCancel}>
              {'取消'}
            </button>
          </div>
        </div>
      )}

      {/* ── 周卡片流 ──────────────────────────── */}
      <div className={`outfit-weeks${isCompact ? ' outfit-weeks-compact' : ''}`}>
        {weeklyOutfits.map(([weekId, dayOutfits]) => {
          const weekStart = new Date(weekId + 'T00:00:00')

          const dayMap = new Map<string, DailyOutfit>()
          for (const o of dayOutfits) dayMap.set(o.date, o)

          return (
            <div key={weekId} className="outfit-week">
              <div className="outfit-week-label">
                {'周 '}{format(weekStart, 'M/d')}
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
                          {'未记录'}
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
          <span className="outfit-stat-label">{'记录'}</span>
        </div>
        <div className="outfit-stat">
          <span className="outfit-stat-num">{stats.uniqueItemsCount}</span>
          <span className="outfit-stat-label">{'单品'}</span>
        </div>
        {stats.topItem && (
          <div className="outfit-stat">
            <span className="outfit-stat-num">{stats.topItem}</span>
            <span className="outfit-stat-label">{'高频单品'}</span>
          </div>
        )}
        <div className="outfit-stat">
          <span className="outfit-stat-num">{stats.noteCount}</span>
          <span className="outfit-stat-label">{'备注'}</span>
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
  flex: 1;
}
.outfit-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.outfit-record-btn {
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: all 0.15s ease;
}
.outfit-record-btn:hover {
  background: var(--accent);
  color: white;
}

/* ── Recording panel ──────────────────── */
.outfit-recording {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--accent);
  margin-bottom: 16px;
}
.outfit-recording-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--heatmap-ink-1);
}
.outfit-date-input {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: var(--heatmap-bg);
  color: var(--heatmap-ink-1);
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}
.outfit-date-input:focus {
  border-color: var(--accent);
}
.outfit-item-add-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.outfit-category-select {
  flex: 0 0 auto;
  padding: 6px 8px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: var(--heatmap-bg);
  color: var(--heatmap-ink-1);
  outline: none;
  font-family: 'Noto Sans SC', sans-serif;
  cursor: pointer;
}
.outfit-category-select:focus {
  border-color: var(--accent);
}
.outfit-item-input {
  flex: 1;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: var(--heatmap-bg);
  color: var(--heatmap-ink-1);
  outline: none;
  font-family: 'Noto Sans SC', sans-serif;
}
.outfit-item-input:focus {
  border-color: var(--accent);
}
.outfit-add-btn {
  flex: 0 0 auto;
  padding: 6px 14px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: white;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: opacity 0.15s ease;
}
.outfit-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.outfit-add-btn:not(:disabled):hover {
  opacity: 0.85;
}
.outfit-item-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.outfit-item-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--heatmap-bg);
  border: 1px solid var(--heatmap-rule);
  color: var(--heatmap-ink-1);
  cursor: pointer;
  transition: border-color 0.15s ease;
  user-select: none;
}
.outfit-item-tag:hover {
  border-color: var(--color-text-danger);
}
.outfit-item-tag-cat {
  font-size: 9px;
  color: var(--heatmap-ink-3);
  margin-right: 2px;
}
.outfit-item-tag-remove {
  font-size: 13px;
  line-height: 1;
  color: var(--heatmap-ink-3);
  margin-left: 2px;
}
.outfit-note-input {
  display: block;
  width: 100%;
  margin-bottom: 12px;
  padding: 8px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: var(--heatmap-bg);
  color: var(--heatmap-ink-1);
  outline: none;
  font-family: 'Noto Sans SC', sans-serif;
  box-sizing: border-box;
}
.outfit-note-input:focus {
  border-color: var(--accent);
}
.outfit-recording-actions {
  display: flex;
  gap: 8px;
}
.outfit-save-btn {
  font-size: 12px;
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: white;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: opacity 0.15s ease;
}
.outfit-save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.outfit-save-btn:not(:disabled):hover {
  opacity: 0.85;
}
.outfit-cancel-btn {
  font-size: 12px;
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: transparent;
  color: var(--heatmap-ink-2);
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: all 0.15s ease;
}
.outfit-cancel-btn:hover {
  border-color: var(--heatmap-ink-3);
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
