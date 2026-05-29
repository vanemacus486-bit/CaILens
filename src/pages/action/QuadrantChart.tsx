/**
 * # QuadrantChart — 待办散点图
 *
 * 展示每条待办在「重要性 × 紧迫性」坐标系中的分布。
 * 每个圆点 = 一条待办（独立或项目内）。
 */

import { useState, useEffect } from 'react'
import type { TodoDotPosition } from '@/domain/quadrant'
import { useCategoryColors } from '@/constants/categoryColors'

interface QuadrantChartProps {
  positions: TodoDotPosition[]
  selectedId: string | null
  onDotClick: (id: string) => void
}

// ── Y 轴固定标签（始终显示全部 5 个，按 CATEGORY_Y 定位） ───

const Y_LABELS: { id: string; name: string; y: number }[] = [
  { id: 'accent', name: '主要矛盾', y: 0.90 },
  { id: 'sage',   name: '次要矛盾', y: 0.70 },
  { id: 'sky',    name: '个人提升', y: 0.50 },
  { id: 'sand',   name: '庶务时间', y: 0.30 },
  { id: 'rose',   name: '娱乐休息', y: 0.10 },
]

// ── 组件 ────────────────────────────────────────────────────

const CATEGORY_NAMES: Record<string, string> = {
  accent: '主要矛盾',
  sage: '次要矛盾',
  sky: '个人提升',
  sand: '庶务时间',
  rose: '娱乐休息',
}

const CHART_BREAKPOINT = 768

export function QuadrantChart({ positions, selectedId, onDotClick }: QuadrantChartProps) {
  const colorMap = useCategoryColors()
  const [chartHeight, setChartHeight] = useState(260)

  // 响应式高度
  useEffect(() => {
    function update() {
      setChartHeight(window.innerWidth < CHART_BREAKPOINT ? 220 : 260)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 收集有数据的分类（标签灰显用）
  const activeCats = new Set(positions.map((p) => p.categoryId))

  // 按分类索引排序的图例数据
  const legendCats = Y_LABELS.filter((l) => activeCats.has(l.id))

  return (
    <div className="flex flex-col gap-3 select-none animate-fadeIn">
      {/* ── 图表卡片 ── */}
      <div className="rounded-xl bg-surface-sunken border border-border-subtle/60 p-4 flex gap-2">
      {/* ── Y 轴标签（绝对定位匹配 CATEGORY_Y） ── */}
      <div
        className="relative py-[3px]"
        style={{ height: chartHeight, width: 64 }}
      >
        {Y_LABELS.map((label) => {
          const hasData = activeCats.has(label.id)
          const topPx = (1 - label.y) * chartHeight
          const catColor = colorMap[label.id as keyof typeof colorMap]
          return (
            <span
              key={label.id}
              className={`absolute right-0 flex items-center gap-1.5 font-sans text-[11px] leading-none transition-opacity ${
                hasData ? 'text-text-tertiary' : 'text-text-quaternary/40'
              }`}
              style={{ top: topPx, transform: 'translateY(-50%)' }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-opacity ${
                  hasData ? '' : 'opacity-40'
                }`}
                style={{ backgroundColor: catColor?.fill ?? '#888' }}
              />
              {label.name}
            </span>
          )
        })}
      </div>

      {/* ── 画布 ── */}
      <div
        className="relative flex-1 border-l border-b border-border-default"
        style={{ height: chartHeight }}
      >
        {/* 垂直中线 */}
        <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-border-subtle/40 pointer-events-none" />

        {/* 分类分隔线 */}
        {[0.2, 0.4, 0.6, 0.8].map((pct) => (
          <div
            key={pct}
            className="absolute left-0 right-0 border-t border-border-subtle/20 pointer-events-none"
            style={{ top: `${pct * 100}%` }}
          />
        ))}

        {/* X 轴标签 */}
        <span className="absolute -bottom-5 left-0 font-mono text-[10px] text-text-quaternary">
          待定
        </span>
        <span className="absolute -bottom-5 left-1/4 -translate-x-1/2 font-mono text-[10px] text-text-quaternary">
          下月
        </span>
        <span className="absolute -bottom-5 left-2/4 -translate-x-1/2 font-mono text-[10px] text-text-quaternary">
          本周
        </span>
        <span className="absolute -bottom-5 right-0 font-mono text-[10px] text-text-quaternary">
          紧急
        </span>

        {/* 待办圆点 */}
        {positions.map((p) => {
          const fill = colorMap[p.categoryId as keyof typeof colorMap]?.fill ?? '#888'
          const isSelected = p.todoId === selectedId
          const radius = isSelected ? 10 : 7

          return (
            <button
              key={p.todoId}
              className="absolute rounded-full cursor-pointer border-none outline-none hover:z-10 group"
              style={{
                left: `${p.x * 100}%`,
                top: `${(1 - p.y) * 100}%`,
                width: radius * 2,
                height: radius * 2,
                backgroundColor: fill,
                transform: 'translate(-50%, -50%)',
                boxShadow: isSelected
                  ? `0 0 0 3px ${fill}40`
                  : `0 0 0 0 ${fill}00`,
                transition: 'transform 200ms ease-out, box-shadow 200ms ease-out, width 200ms, height 200ms',
              }}
              onClick={() => onDotClick(p.todoId)}
              title={p.title}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.transform = 'translate(-50%, -50%) scale(1.3)'
                el.style.boxShadow = `0 0 0 4px ${fill}30`
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.transform = 'translate(-50%, -50%)'
                el.style.boxShadow = isSelected
                  ? `0 0 0 3px ${fill}40`
                  : `0 0 0 0 ${fill}00`
              }}
            >
              {/* tooltip */}
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-surface-raised border border-border-subtle px-2.5 py-1.5 rounded-lg text-[11px] font-sans text-text-primary shadow-tooltip z-20
                before:content-[''] before:absolute before:left-1/2 before:-translate-x-1/2 before:top-full before:border-4 before:border-transparent before:border-t-border-subtle">
                {p.title}
                {p.projectName && (
                  <span className="text-text-quaternary ml-1">· {p.projectName}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      </div>

      {/* ── 图例行 ── */}
      {legendCats.length > 1 && (
        <div className="flex items-center gap-3 px-1">
          {legendCats.map((cat) => {
            const catColor = colorMap[cat.id as keyof typeof colorMap]
            return (
              <span key={cat.id} className="flex items-center gap-1.5 font-sans text-[10px] text-text-quaternary">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: catColor?.fill ?? '#888' }}
                />
                {CATEGORY_NAMES[cat.id] ?? cat.name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
