/**
 * # labelStack — 1‑D 标签防重叠
 *
 * 将一组带「理想纵坐标」的标签，在 [top, bottom] 区间内按最小间距 gap 推开，
 * 尽量贴近各自理想位置并保持相对顺序。用于折线图右端点标签的去重叠。
 *
 * 纯函数，零副作用，不依赖 React / DOM / recharts。
 */

export interface LabelAnchor {
  key: string
  /** 理想纵坐标（像素，越小越靠上） */
  idealY: number
}

/**
 * 返回 key → 调整后纵坐标。
 *
 * 算法：
 * 1. 按理想位置升序排序、夹到 [top, bottom]
 * 2. 自上而下推开，保证相邻间距 ≥ gap
 * 3. 若末项越过 bottom，则钉在 bottom 并向上回挤
 * 4. 若首项越过 top（空间不足时可能发生），钉在 top 再向下传播一次
 *
 * 当 (n−1)·gap > bottom−top 时空间不够，结果仍尽量均布但间距可能略小于 gap。
 */
export function resolveLabelStack(
  anchors: readonly LabelAnchor[],
  opts: { top: number; bottom: number; gap: number },
): Map<string, number> {
  const { top, bottom, gap } = opts
  const result = new Map<string, number>()
  if (anchors.length === 0) return result

  const sorted = [...anchors].sort((a, b) => a.idealY - b.idealY)
  const ys = sorted.map((a) => Math.min(Math.max(a.idealY, top), bottom))

  // 2. 自上而下推开
  for (let i = 1; i < ys.length; i++) {
    if (ys[i] < ys[i - 1] + gap) ys[i] = ys[i - 1] + gap
  }

  // 3. 触底回挤
  if (ys[ys.length - 1] > bottom) {
    ys[ys.length - 1] = bottom
    for (let i = ys.length - 2; i >= 0; i--) {
      if (ys[i] > ys[i + 1] - gap) ys[i] = ys[i + 1] - gap
    }
  }

  // 4. 顶部兜底（空间不足时第一项可能被挤过 top）
  if (ys[0] < top) {
    ys[0] = top
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] < ys[i - 1] + gap) ys[i] = ys[i - 1] + gap
    }
  }

  sorted.forEach((a, i) => result.set(a.key, ys[i]))
  return result
}
