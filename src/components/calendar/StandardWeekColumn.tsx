import React from 'react'
import type { MergedBlock } from '@/domain/standardWeek'
import { MAX_OVERLAP_COLUMNS, TOTAL_SLOTS } from '@/features/week-view/constants'
import { StandardWeekBlock } from './StandardWeekBlock'

interface StandardWeekColumnProps {
  weekday: number
  blocks: MergedBlock[]
  spanWeeks: number
  language: 'zh' | 'en'
}

const GRID_STYLE = {
  gridTemplateRows: `repeat(${TOTAL_SLOTS}, 1fr)`,
  gridTemplateColumns: `repeat(${MAX_OVERLAP_COLUMNS}, 1fr)`,
} as const

const SLOT_INDICES = Array.from({ length: TOTAL_SLOTS }, (_, i) => i)

export const StandardWeekColumn = React.memo(function StandardWeekColumn({
  weekday: _weekday,
  blocks,
  spanWeeks,
  language,
}: StandardWeekColumnProps) {
  return (
    <div className="h-full border-r border-border-subtle relative">
      <div className="absolute inset-0 grid" style={GRID_STYLE}>
        {SLOT_INDICES.map((i) => (
          <div
            key={i}
            className="border-t border-border-subtle"
            style={{ gridColumn: `1 / ${MAX_OVERLAP_COLUMNS + 1}`, gridRow: i + 1 }}
          />
        ))}

        {blocks.map((block) => {
          const rowStart = block.startHour * 2 + 1
          const rowEnd = block.endHour * 2 + 1

          return (
            <div
              key={`${block.weekday}-${block.startHour}`}
              style={{
                gridRowStart: rowStart,
                gridRowEnd: rowEnd,
                gridColumnStart: 1,
                gridColumnEnd: MAX_OVERLAP_COLUMNS + 1,
              }}
            >
              <StandardWeekBlock
                block={block}
                spanWeeks={spanWeeks}
                language={language}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
})
