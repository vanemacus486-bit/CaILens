/**
 * # goalMindMapLayout — 横向脑图布局纯函数
 *
 * 把 GoalNode 树排成「左主目标 → 右子目标」的横向布局：
 * - x 由 depth 决定（列）
 * - y 由后序遍历决定（叶子顺序铺行，父节点取子节点中点）
 * 返回绝对坐标节点 + 父子连线坐标，组件据此绝对定位 + 画贝塞尔曲线。
 * 零副作用，不依赖 React/Dexie/浏览器 API。
 */

import type { GoalNode } from './goalTree'
import type { CategoryId } from './category'
import type { GoalStatus } from './goal'

// ── 尺寸常量（组件与布局共用） ──────────────────────────────

export const MIND_NODE_W = 176
export const MIND_NODE_H = 64
export const MIND_H_GAP = 64
export const MIND_V_GAP = 16

const COL_PITCH = MIND_NODE_W + MIND_H_GAP
const ROW_PITCH = MIND_NODE_H + MIND_V_GAP

// ── 输出类型 ────────────────────────────────────────────────

export interface MindMapNodePos {
  id: string
  title: string
  depth: number
  /** 左上角坐标 */
  x: number
  y: number
  categoryId: CategoryId | null
  status: GoalStatus
  parentId: string | null
  hasChildren: boolean
}

export interface MindMapEdge {
  fromId: string
  toId: string
  /** 父节点右中点 */
  x1: number
  y1: number
  /** 子节点左中点 */
  x2: number
  y2: number
}

export interface MindMapLayout {
  nodes: MindMapNodePos[]
  edges: MindMapEdge[]
  width: number
  height: number
}

// ── 主函数 ──────────────────────────────────────────────────

export function computeMindMapLayout(root: GoalNode, collapsed?: Set<string>): MindMapLayout {
  const nodes: MindMapNodePos[] = []
  const edges: MindMapEdge[] = []
  let rowCursor = 0
  let maxDepth = 0

  // 后序遍历：先排子节点，父节点 y 取首尾子节点中点
  function assign(node: GoalNode, depth: number, parentId: string | null): MindMapNodePos {
    if (depth > maxDepth) maxDepth = depth
    const x = depth * COL_PITCH

    // 折叠节点：按叶子绘制（不递归子树、不画子连线），但仍标记 hasChildren 供显示折叠徽标
    const isCollapsed = collapsed?.has(node.goal.id) ?? false
    const laidOutChildren = isCollapsed ? [] : node.children

    let y: number
    if (laidOutChildren.length === 0) {
      y = rowCursor * ROW_PITCH
      rowCursor++
    } else {
      const childPositions = laidOutChildren.map((c) => assign(c, depth + 1, node.goal.id))
      const first = childPositions[0].y
      const last = childPositions[childPositions.length - 1].y
      y = (first + last) / 2
    }

    const pos: MindMapNodePos = {
      id: node.goal.id,
      title: node.goal.title,
      depth,
      x,
      y,
      categoryId: node.goal.categoryId,
      status: node.goal.status,
      parentId,
      hasChildren: node.children.length > 0,
    }
    nodes.push(pos)

    // 连线（父 → 各直接子）
    for (const child of laidOutChildren) {
      const childPos = nodes.find((n) => n.id === child.goal.id)
      if (childPos) {
        edges.push({
          fromId: node.goal.id,
          toId: child.goal.id,
          x1: x + MIND_NODE_W,
          y1: y + MIND_NODE_H / 2,
          x2: childPos.x,
          y2: childPos.y + MIND_NODE_H / 2,
        })
      }
    }

    return pos
  }

  assign(root, 0, null)

  const rows = Math.max(1, rowCursor)
  const width = (maxDepth + 1) * COL_PITCH - MIND_H_GAP
  const height = rows * ROW_PITCH - MIND_V_GAP

  return { nodes, edges, width, height }
}

/** 贝塞尔曲线 path d（水平 S 形连接） */
export function edgePath(e: MindMapEdge): string {
  const midX = (e.x1 + e.x2) / 2
  return `M ${e.x1} ${e.y1} C ${midX} ${e.y1}, ${midX} ${e.y2}, ${e.x2} ${e.y2}`
}
