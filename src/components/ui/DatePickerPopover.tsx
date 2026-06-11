/**
 * # DatePickerPopover — 轻量月历日期选择器
 *
 * 基于 Radix Popover + date-fns。零新依赖。
 * 弹出月历网格，支持选确切日期，配合预设快捷选项使用。
 */

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DatePickerPopoverProps {
  /** UTC 毫秒时间戳（已选日期），null = 无期限 */
  value: number | null
  /** 选中或清除回调 */
  onChange: (value: number | null) => void
  /** 触发按钮 */
  trigger: React.ReactNode
  /** 是否允许「清除」操作 */
  allowClear?: boolean
  /** 是否禁用 */
  disabled?: boolean
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function toStartOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function DatePickerPopover({
  value,
  onChange,
  trigger,
  allowClear = true,
  disabled = false,
}: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = value !== null ? new Date(value) : null
  const [viewMonth, setViewMonth] = useState(() =>
    selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date()),
  )

  const days = eachDayOfInterval({
    start: startOfWeek(viewMonth, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  const handlePrev = useCallback(() => {
    setViewMonth((m) => subMonths(m, 1))
  }, [])

  const handleNext = useCallback(() => {
    setViewMonth((m) => addMonths(m, 1))
  }, [])

  const handleSelect = useCallback(
    (day: Date) => {
      onChange(toStartOfDay(day.getTime()))
      setOpen(false)
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    onChange(null)
    setOpen(false)
  }, [onChange])

  const handleToday = useCallback(() => {
    onChange(toStartOfDay(Date.now()))
    setOpen(false)
  }, [onChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[256px] p-3" align="start" side="bottom">
        {/* 月份导航 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePrev}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
            aria-label="上个月"
          >
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
          <span className="font-serif text-sm font-medium text-text-primary select-none">
            {format(viewMonth, 'yyyy 年 M 月')}
          </span>
          <button
            onClick={handleNext}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
            aria-label="下个月"
          >
            <ChevronRight size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* 星期表头 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="h-7 flex items-center justify-center font-sans text-[10px] text-text-quaternary select-none"
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = isSameMonth(day, viewMonth)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isDayToday = isToday(day)

            return (
              <button
                key={day.getTime()}
                onClick={() => handleSelect(day)}
                className={`
                  h-8 w-full rounded-lg text-xs font-sans cursor-pointer border-none transition-all duration-150
                  ${!inMonth ? 'text-text-quaternary/30' : ''}
                  ${isSelected
                    ? 'bg-accent text-white font-medium'
                    : inMonth
                      ? 'text-text-primary hover:bg-surface-sunken'
                      : ''
                  }
                  ${isDayToday && !isSelected && inMonth
                    ? 'ring-1 ring-accent/50'
                    : ''
                  }
                `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        {/* 快捷操作 */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/50">
          <button
            onClick={handleToday}
            className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-sans text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            <CalendarDays size={12} strokeWidth={1.75} />
            今天
          </button>

          {allowClear && value !== null && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-sans text-text-tertiary hover:text-color-text-danger hover:bg-color-bg-danger transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={12} strokeWidth={1.75} />
              清除
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
