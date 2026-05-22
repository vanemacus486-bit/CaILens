/**
 * # CorrelationInsights — 关联分析洞察卡片列表
 *
 * 展示生活方式变量与作息指标的相关性分析结果。
 * 每条洞察以对比卡片呈现，附相关性声明和"生活实验"入口。
 */

import { useMemo, useState } from 'react'
import type { CalendarEvent } from '@/domain/event'
import type { DailyHygiene } from '@/domain/dailyContext'
import type { AppLanguage } from '@/domain/settings'
import { runCorrelation } from '@/domain/correlation'
import type { ComparisonResult } from '@/domain/correlation'

interface Props {
  rangeEvents: CalendarEvent[]
  hygieneRecords: DailyHygiene[]
  language: AppLanguage
}

// ── 强度标签 ──────────────────────────────────────────────

function strengthTag(strength: ComparisonResult['strength'], t: (a: string, b: string) => string) {
  const config = {
    strong:   { label: t('显著相关', 'Strong'),      color: 'var(--color-text-warning)' },
    moderate: { label: t('中度相关', 'Moderate'),    color: 'var(--color-text-info)' },
    weak:     { label: t('弱相关', 'Weak'),          color: 'var(--heatmap-ink-3)' },
    none:     { label: t('未发现相关', 'None found'), color: 'var(--heatmap-ink-3)' },
  }
  return config[strength]
}

// ── 组件 ──────────────────────────────────────────────────

export function CorrelationInsights({ rangeEvents, hygieneRecords, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [periodDays] = useState(30)

  const result = useMemo(
    () => runCorrelation(rangeEvents, hygieneRecords, periodDays),
    [rangeEvents, hygieneRecords, periodDays],
  )

  return (
    <div className="correlation-root">
      <style>{CORRELATION_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="correlation-title-area">
        <span className="correlation-title-main">
          {t('关联分析', 'Correlation Insights')}
        </span>
        <p className="correlation-title-desc">
          {t(
            `基于最近 ${periodDays} 天的数据，比较不同生活变量下的作息差异`,
            `Comparing lifestyle variables vs sleep metrics — last ${periodDays} days`,
          )}
        </p>
      </div>

      {/* ⚠️ 声明 */}
      <div className="correlation-disclaimer">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" />
          <path d="M7 4V8M7 9.5V10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
        <span>
          {t(
            '相关性不等于因果。以下分析仅展示数据层面的差异，可能存在未纳入考量的其他变量。',
            'Correlation ≠ causation. These comparisons show data-level differences; other variables may be at play.',
          )}
        </span>
      </div>

      {/* ── 洞察卡片列表 ────────────────────────── */}
      {result.comparisons.length === 0 ? (
        <div className="correlation-empty">
          <p className="correlation-empty-text">
            {t(
              '尚无足够数据生成关联分析。请继续记录日常活动与作息。',
              'Not enough data for correlation analysis yet. Keep logging!',
            )}
          </p>
        </div>
      ) : (
        <div className="correlation-cards">
          {result.comparisons.map((c, i) => {
            const tag = strengthTag(c.strength, t)

            return (
              <div key={i} className="correlation-card">
                {/* 标题行 */}
                <div className="correlation-card-header">
                  <div className="correlation-card-title">
                    <span className="correlation-card-icon">
                      {c.variableNameZh === '咖啡因摄入' ? '☕'
                        : c.variableNameZh === '糖分摄入' ? '🍬'
                          : c.variableNameZh === '宵夜' ? '🌙'
                            : c.variableNameZh === '卫生分数' ? '🧹'
                              : '📊'}
                    </span>
                    <span>{language === 'zh' ? c.variableNameZh : c.variableName}</span>
                  </div>
                  <span className="correlation-tag" style={{ color: tag.color, borderColor: tag.color }}>
                    {tag.label}
                  </span>
                </div>

                {/* 详细数据 */}
                <div className="correlation-card-body">
                  {/* 对比行 */}
                  <div className="correlation-compare">
                    <div className="correlation-group">
                      <span className="correlation-group-label">
                        {language === 'zh' ? c.groupALabel : c.groupALabel}
                      </span>
                      <span className="correlation-group-n">{c.groupAN}{t('条', ' records')}</span>
                      <span className="correlation-group-value">{c.groupAValue}</span>
                    </div>

                    <div className="correlation-vs">
                      <span className="correlation-vs-text">VS</span>
                      {c.diffHours !== null && Math.abs(c.diffHours) > 0.1 && (
                        <span
                          className="correlation-diff"
                          style={{
                            color: Math.abs(c.diffHours) > 0.33
                              ? 'var(--color-text-warning)'
                              : 'var(--heatmap-ink-3)',
                          }}
                        >
                          {c.diffHours > 0 ? '+' : ''}{(c.diffHours * 60).toFixed(0)}{t('分钟', 'min')}
                        </span>
                      )}
                    </div>

                    <div className="correlation-group">
                      <span className="correlation-group-label">
                        {language === 'zh' ? c.groupBLabel : c.groupBLabel}
                      </span>
                      <span className="correlation-group-n">{c.groupBN}{t('条', ' records')}</span>
                      <span className="correlation-group-value">{c.groupBValue}</span>
                    </div>
                  </div>

                  {/* 结论标签 */}
                  <div className="correlation-conclusion">
                    {language === 'zh' ? c.difference : c.difference}
                  </div>
                </div>

                {/* 建议 */}
                <div className="correlation-card-footer">
                  <div className="correlation-suggestion">
                    <span className="correlation-suggestion-icon">💡</span>
                    <span>{language === 'zh' ? c.suggestionZh : c.suggestion}</span>
                  </div>

                  {/* 生活实验入口（非功能，仅展示） */}
                  {c.strength === 'strong' && (
                    <button
                      className="correlation-experiment-btn"
                      title={t('发起生活实验', 'Start an experiment')}
                      disabled
                    >
                      🧪 {t('发起实验', 'Experiment')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 声明脚注 ──────────────────────────── */}
      <div className="correlation-footnote">
        {t(
          '💡 想确认某个变量是否真的影响你？试试"生活实验"：主动调整一个变量（比如一周不喝咖啡），对比前后的作息数据。',
          '💡 Want to confirm a real effect? Try a "life experiment": adjust one variable (e.g. no caffeine for a week) and compare before/after.',
        )}
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const CORRELATION_CSS = `
.correlation-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.correlation-title-area {
  margin-bottom: 12px;
}
.correlation-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.correlation-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 6px 0 0;
}

/* ── Disclaimer ────────────────────────────── */
.correlation-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-bg-info);
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 11px;
  color: var(--color-text-info);
  line-height: 1.5;
}
.correlation-disclaimer svg {
  flex-shrink: 0;
  margin-top: 2px;
}

/* ── Empty state ────────────────────────────── */
.correlation-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.correlation-empty-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
}

/* ── Cards ────────────────────────────────── */
.correlation-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.correlation-card {
  background: var(--heatmap-bg-card);
  border-radius: 10px;
  border: 1px solid var(--heatmap-rule);
  overflow: hidden;
}

/* ── Card header ──────────────────────────── */
.correlation-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 0;
}
.correlation-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.correlation-card-icon { font-size: 16px; }
.correlation-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid;
}

/* ── Card body ────────────────────────────── */
.correlation-card-body {
  padding: 12px 16px;
}
.correlation-compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}
.correlation-group {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.correlation-group-label {
  font-size: 11px;
  color: var(--heatmap-ink-2);
}
.correlation-group-n {
  font-size: 10px;
  color: var(--heatmap-ink-3);
}
.correlation-group-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.correlation-vs {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
.correlation-vs-text {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  opacity: 0.5;
}
.correlation-diff {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
}
.correlation-conclusion {
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--heatmap-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--heatmap-ink-2);
  text-align: center;
  line-height: 1.5;
}

/* ── Card footer ──────────────────────────── */
.correlation-card-footer {
  padding: 10px 16px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--heatmap-rule);
}
.correlation-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: var(--heatmap-ink-2);
  line-height: 1.5;
  flex: 1;
}
.correlation-suggestion-icon { flex-shrink: 0; }
.correlation-experiment-btn {
  flex-shrink: 0;
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  cursor: not-allowed;
  opacity: 0.6;
  font-family: 'Noto Sans SC', sans-serif;
  transition: opacity 0.2s ease;
}

/* ── Footnote ────────────────────────────── */
.correlation-footnote {
  margin-top: 24px;
  padding: 12px 16px;
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  font-size: 12px;
  color: var(--heatmap-ink-3);
  line-height: 1.5;
  text-align: center;
}

@media (max-width: 719px) {
  .correlation-title-main { font-size: 22px; }
  .correlation-compare { gap: 8px; }
  .correlation-group-value { font-size: 13px; }
}
`