import { useEffect, useRef } from 'react'

/**
 * 设置内容区滚动复位。
 *
 * 切换到另一页时，旧页面可能停在半中间（尤其从搜索结果跳转过去之后），
 * 新页面若沿用这个滚动位置，会从一半开始显示。Obsidian 的做法是切页回顶。
 *
 * 注意顺序：切页 → 本 effect 滚到顶部 → 搜索跳转的两次 rAF 再滚到目标行。
 * 因此搜索跳转仍然落在正确位置，而普通切页会回到顶部。
 */
export function useSettingsScrollReset(key: string) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [key])

  return ref
}
