/**
 * # CardInput — 录入卡里唯一的文字输入框
 *
 * 三种模式（默认 / 饮食 / 睡眠以外的录入态）共用同一份样式。
 *
 * 皮肤：纸（paper）
 * - 衬线字体，字重 450，像在纸上写字而不是填表单
 * - 没有圆角盒子。整张卡就是一张纸，输入区只是纸上的一行
 * - 聚焦时出现一条极淡的下划线，不画焦点环 —— 焦点环是「控件」的语言，
 *   下划线是「纸」的语言
 * - placeholder 用斜体，和正文区分开
 * - 幽灵补全仍走原生 input（光标/选区/输入法全部原生），
 *   后缀画在测量过的文字宽度之后，长文本时随滚动同步位移
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface CardInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** 当前分类的 fill 变量名，如 'var(--event-sand-fill)' */
  accent?: string
  /** 幽灵补全后缀（不含已输入部分） */
  ghostSuffix?: string
  /** 幽灵补全右侧的次数角标 */
  ghostCount?: number
  /** 输入框右端的附加控件（如「饮食」快捷按钮） */
  rightSlot?: React.ReactNode
  ariaLabel?: string
}

export function CardInput({
  id, value, onChange, onKeyDown, placeholder, inputRef,
  accent = 'var(--accent)', ghostSuffix = '', ghostCount, rightSlot, ariaLabel,
}: CardInputProps) {
  const localRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? localRef

  // 已输入文字的像素宽度 → 幽灵后缀的起始位置（同字体同字号测量）
  const measureRef = useRef<HTMLSpanElement>(null)
  const [typedWidth, setTypedWidth] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useLayoutEffect(() => {
    setTypedWidth(measureRef.current?.offsetWidth ?? 0)
    setScrollLeft(ref.current?.scrollLeft ?? 0)
  }, [value, ref])

  const showGhost = ghostSuffix.length > 0

  return (
    <div
      className="relative flex items-center overflow-hidden"
      style={{
        // 下划线颜色跟随分类；未聚焦时透明，聚焦时淡入
        ['--card-underline' as string]: `color-mix(in srgb, ${accent} 42%, transparent)`,
        ['--card-caret' as string]: accent,
      }}
      data-card-input=""
      data-skin="paper"
    >
      <style>{`
        [data-card-input][data-skin="paper"] {
          border-bottom: 1px solid transparent;
          transition: border-color 220ms ease;
        }
        [data-card-input][data-skin="paper"]:focus-within {
          border-bottom-color: var(--card-underline);
        }
      `}</style>

      {/* 隐藏测量层：与 input 完全同字体，仅用于取已输入宽度 */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre font-serif text-lg"
      >
        {value}
      </span>

      <input
        id={id}
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        placeholder={showGhost ? '' : placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'relative z-10 h-11 min-w-0 flex-1 bg-transparent font-serif text-lg font-[450]',
          'text-text-primary tracking-[-0.008em] outline-none',
          'placeholder:italic placeholder:text-text-tertiary/60',
          rightSlot ? 'pr-2' : 'pr-0',
        )}
        style={{ caretColor: 'var(--card-caret)' }}
      />

      {/* 幽灵补全：只在真实文字之后画后缀，不遮盖光标 */}
      {showGhost && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 flex h-11 items-center overflow-hidden whitespace-pre font-serif text-lg italic text-text-quaternary"
          style={{ left: typedWidth - scrollLeft }}
        >
          {ghostSuffix}
          {ghostCount !== undefined && (
            <span className="ml-1.5 font-mono text-2xs not-italic text-text-quaternary/70">{ghostCount}</span>
          )}
        </span>
      )}

      {rightSlot}
    </div>
  )
}
