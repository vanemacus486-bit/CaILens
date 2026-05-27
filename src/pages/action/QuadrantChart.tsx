/**
 * # QuadrantChart — 待办散点图
 *
 * 展示每条待办在「重要性 × 紧迫性」坐标系中的分布。
 * 每个圆点 = 一条待办（独立或项目内）。
 */

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

export function QuadrantChart({ positions, selectedId, onDotClick }: QuadrantChartProps) {
  const colorMap = useCategoryColors()
  const chartHeight = 260

  // 收集有数据的分类（标签灰显用）
  const activeCats = new Set(positions.map((p) => p.categoryId))

  return (
    <div className="flex gap-2 select-none">
      {/* ── Y 轴标签（绝对定位匹配 CATEGORY_Y） ── */}
      <div
        className="relative py-[3px]"
        style={{ height: chartHeight, width: 56 }}
      >
        {Y_LABELS.map((label) => {
          const hasData = activeCats.has(label.id)
          const topPx = (1 - label.y) * chartHeight
          return (
            <span
              key={label.id}
              className={`absolute right-0 font-sans text-[11px] leading-none transition-opacity ${
                hasData ? 'text-text-tertiary' : 'text-text-quaternary/40'
              }`}
              style={{ top: topPx, transform: 'translateY(-50%)' }}
            >
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
          const radius = isSelected ? 8 : 6

          return (
            <button
              key={p.todoId}
              className="absolute rounded-full transition-all duration-200 cursor-pointer border-none outline-none hover:z-10 group"
              style={{
                left: `${p.x * 100}%`,
                top: `${(1 - p.y) * 100}%`,
                width: radius * 2,
                height: radius * 2,
                backgroundColor: fill,
                transform: 'translate(-50%, -50%)',
                boxShadow: isSelected
                  ? `0 0 0 3px ${fill}40`
                  : 'none',
              }}
              onClick={() => onDotClick(p.todoId)}
              title={p.title}
            >
              {/* tooltip */}
              <span className="absolute left-1/2 -translate-x-1/2 -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-surface-raised border border-border-subtle px-2 py-1 rounded-md text-[11px] font-sans text-text-primary shadow-sm z-20">
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
  )
}
