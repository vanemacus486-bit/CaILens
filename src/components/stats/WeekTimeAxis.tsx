/**
 * # WeekTimeAxis — 周时刻轴
 *
 * 复盘「日常」饮食/卫生周视图共用的呈现原语。
 * 7 天各一行，对齐到同一条 24h 标尺；上方细轴按时刻定位色点，
 * 下方列表显示时间+名称+详情/标签；无时刻项归入「全天」行。
 * 纯展示，无 store/domain 依赖。
 */

import { type JSX } from 'react'

// ── 类型 ────────────────────────────────────────────────────

export interface AxisTimedItem {
  id: string
  /** 距零点小时数，0–24 小数（13:20 → 13.333） */
  hour: number
  /** 时刻文本，如 "13:20" */
  timeLabel: string
  /** CSS 变量色值，如 "var(--event-sky-fill)" */
  color: string
  /** 名称，如 "晚餐" / "洗澡" */
  label: string
  /** 详情副文本，如 "火锅"；缺省不渲染 */
  detail?: string
  /** 标签，如 ["蛋白质","糖分"]；缺省不渲染 */
  tags?: readonly string[]
}

export interface AxisAllDayItem {
  id: string
  color: string
  label: string
}

export interface AxisDay {
  date: string           // yyyy-MM-dd
  dayLabel: string       // "周一 6/15"（调用方本地化）
  isToday: boolean
  timed: AxisTimedItem[] // 按 hour 升序
  allDay: AxisAllDayItem[]
}

interface Props {
  days: AxisDay[]        // 周一→周日，长度 7
  allDayLabel?: string   // 默认 "全天"
  emptyHint?: string     // 默认 "—"
}

// ── 时刻标尺刻度 ────────────────────────────────────────────

const HOUR_TICKS = [0, 6, 12, 18, 24]

// ── 组件 ────────────────────────────────────────────────────

export function WeekTimeAxis({ days, allDayLabel = '全天', emptyHint = '—' }: Props): JSX.Element {
  return (
    <div className="wta-root">
      <style>{WTA_CSS}</style>

      {/* 顶部共享标尺 */}
      <div className="wta-ruler">
        <div className="wta-ruler-label" />
        <div className="wta-ruler-track">
          {HOUR_TICKS.map((h) => (
            <span key={h} className="wta-tick" style={{ left: `${(h / 24) * 100}%` }}>
              {h}
            </span>
          ))}
        </div>
      </div>

      {days.map((day) => {
        const hasAny = day.timed.length > 0 || day.allDay.length > 0
        return (
          <div key={day.date} className={`wta-day${day.isToday ? ' wta-day-today' : ''}`}>
            {/* 轴行 */}
            <div className="wta-axis-row">
              <span className="wta-day-label">
                {day.dayLabel}
                {day.isToday && <span className="wta-today-badge">今天</span>}
              </span>
              <div className="wta-track">
                {day.timed.map((it) => (
                  <span
                    key={it.id}
                    className="wta-mark"
                    style={{ left: `${(it.hour / 24) * 100}%`, background: it.color }}
                    title={`${it.timeLabel} ${it.label}${it.detail ? ' · ' + it.detail : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* 明细 */}
            <div className="wta-detail">
              {!hasAny && <span className="wta-empty">{emptyHint}</span>}

              {day.timed.map((it) => (
                <div key={it.id} className="wta-item">
                  <span className="wta-item-dot" style={{ background: it.color }} />
                  <span className="wta-item-time">{it.timeLabel}</span>
                  <span className="wta-item-label">{it.label}</span>
                  {it.detail && <span className="wta-item-detail">{it.detail}</span>}
                  {it.tags && it.tags.length > 0 && (
                    <span className="wta-item-tags">
                      {it.tags.map((t) => (
                        <span key={t} className="wta-tag">{t}</span>
                      ))}
                    </span>
                  )}
                </div>
              ))}

              {day.allDay.length > 0 && (
                <div className="wta-allday">
                  <span className="wta-allday-prefix">{allDayLabel}</span>
                  {day.allDay.map((it) => (
                    <span key={it.id} className="wta-allday-chip">
                      <span className="wta-allday-dot" style={{ background: it.color }} />
                      {it.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const WTA_CSS = `
.wta-root {
  width: 100%;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
  border: 1px solid var(--heatmap-rule);
  border-radius: 8px;
  padding: 10px 14px;
}

/* 标尺 */
.wta-ruler { display: grid; grid-template-columns: 96px 1fr; align-items: center; margin-bottom: 4px; }
.wta-ruler-track { position: relative; height: 14px; }
.wta-tick {
  position: absolute; transform: translateX(-50%);
  font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--heatmap-ink-3);
}
.wta-tick:first-child { transform: translateX(0); }
.wta-tick:last-child { transform: translateX(-100%); }

/* 每天 */
.wta-day { padding: 8px 0; border-bottom: 1px solid var(--heatmap-rule); }
.wta-day:last-child { border-bottom: none; }

.wta-axis-row { display: grid; grid-template-columns: 96px 1fr; align-items: center; }
.wta-day-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--heatmap-ink-1); }
.wta-day-today .wta-day-label { color: var(--accent); }
.wta-today-badge { font-size: 10px; font-weight: 500; color: var(--accent); background: rgba(201,100,66,0.10); padding: 1px 6px; border-radius: 4px; }

.wta-track {
  position: relative; height: 20px;
  background-image: linear-gradient(to right, var(--heatmap-rule) 1px, transparent 1px);
  background-size: 25% 100%;
}
.wta-track::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--heatmap-rule); }
.wta-mark {
  position: absolute; top: 50%; width: 8px; height: 8px; border-radius: 50%;
  transform: translate(-50%, -50%); border: 1.5px solid var(--heatmap-bg-card); box-sizing: content-box; z-index: 1;
}

/* 明细 */
.wta-detail { padding-left: 96px; margin-top: 2px; }
.wta-empty { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--heatmap-ink-3); opacity: 0.4; }
.wta-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 13px; }
.wta-item-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.wta-item-time { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--heatmap-ink-3); width: 40px; flex-shrink: 0; }
.wta-item-label { color: var(--heatmap-ink-1); }
.wta-item-detail { color: var(--heatmap-ink-2); }
.wta-item-tags { display: flex; gap: 3px; margin-left: auto; }
.wta-tag { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: var(--heatmap-bg); color: var(--heatmap-ink-3); white-space: nowrap; }

.wta-allday { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 4px 0 2px; }
.wta-allday-prefix { font-size: 10px; color: var(--heatmap-ink-3); letter-spacing: 0.1em; }
.wta-allday-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--heatmap-ink-1); }
.wta-allday-dot { width: 6px; height: 6px; border-radius: 50%; }
`
