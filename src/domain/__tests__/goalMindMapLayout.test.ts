import { describe, it, expect } from 'vitest'
import {
  computeMindMapLayout,
  edgePath,
  MIND_NODE_W,
  MIND_NODE_H,
  MIND_H_GAP,
  MIND_V_GAP,
} from '../goalMindMapLayout'
import type { GoalNode } from '../goalTree'
import type { Goal } from '../goal'

const COL_PITCH = MIND_NODE_W + MIND_H_GAP
const ROW_PITCH = MIND_NODE_H + MIND_V_GAP

function goal(id: string, title = id): Goal {
  return {
    id,
    parentId: null,
    title,
    description: '',
    categoryId: null,
    status: 'active',
    sortOrder: 0,
    targetDate: null,
    createdAt: 0,
    updatedAt: 0,
  }
}

function node(id: string, children: GoalNode[] = [], depth = 0): GoalNode {
  return { goal: goal(id), children, depth }
}

describe('computeMindMapLayout', () => {
  it('单节点：x=0 y=0，宽高为单节点尺寸', () => {
    const layout = computeMindMapLayout(node('root'))
    expect(layout.nodes).toHaveLength(1)
    expect(layout.nodes[0]).toMatchObject({ id: 'root', x: 0, y: 0, depth: 0 })
    expect(layout.edges).toHaveLength(0)
    expect(layout.width).toBe(MIND_NODE_W)
    expect(layout.height).toBe(MIND_NODE_H)
  })

  it('主目标 + 3 叶子：子节点铺三行，父取中点', () => {
    const root = node('root', [node('c0'), node('c1'), node('c2')])
    const layout = computeMindMapLayout(root)

    expect(layout.nodes).toHaveLength(4)
    const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]))

    // 子节点：第二列，三行
    expect(byId.c0).toMatchObject({ x: COL_PITCH, y: 0 })
    expect(byId.c1).toMatchObject({ x: COL_PITCH, y: ROW_PITCH })
    expect(byId.c2).toMatchObject({ x: COL_PITCH, y: ROW_PITCH * 2 })

    // 主目标：第一列，y 取首尾子节点中点
    expect(byId.root).toMatchObject({ x: 0, y: ROW_PITCH }) // (0 + 2*pitch)/2

    // 三条连线
    expect(layout.edges).toHaveLength(3)
    expect(layout.width).toBe(2 * COL_PITCH - MIND_H_GAP)
    expect(layout.height).toBe(3 * ROW_PITCH - MIND_V_GAP)
  })

  it('连线坐标：父右中点 → 子左中点', () => {
    const root = node('root', [node('c0')])
    const layout = computeMindMapLayout(root)
    const e = layout.edges[0]
    expect(e).toMatchObject({
      fromId: 'root',
      toId: 'c0',
      x1: MIND_NODE_W,
      x2: COL_PITCH,
    })
    expect(e.y1).toBe(MIND_NODE_H / 2)
    expect(e.y2).toBe(MIND_NODE_H / 2)
  })

  it('深层树：depth 决定列', () => {
    const root = node('root', [node('a', [node('b')])])
    const layout = computeMindMapLayout(root)
    const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]))
    expect(byId.root.x).toBe(0)
    expect(byId.a.x).toBe(COL_PITCH)
    expect(byId.b.x).toBe(2 * COL_PITCH)
    expect(layout.edges).toHaveLength(2)
  })

  it('edgePath 生成水平 S 形 cubic bezier', () => {
    const d = edgePath({ fromId: 'a', toId: 'b', x1: 0, y1: 10, x2: 100, y2: 50 })
    expect(d).toBe('M 0 10 C 50 10, 50 50, 100 50')
  })

  it('折叠父节点：后代不出现在 nodes/edges，但 hasChildren 仍为 true', () => {
    const root = node('root', [node('a', [node('a1'), node('a2')]), node('b')])

    const full = computeMindMapLayout(root)
    expect(full.nodes.map((n) => n.id).sort()).toEqual(['a', 'a1', 'a2', 'b', 'root'])

    const collapsed = computeMindMapLayout(root, new Set(['a']))
    const ids = collapsed.nodes.map((n) => n.id)
    expect(ids).toContain('a')
    expect(ids).not.toContain('a1')
    expect(ids).not.toContain('a2')

    const aPos = collapsed.nodes.find((n) => n.id === 'a')!
    expect(aPos.hasChildren).toBe(true) // 折叠后仍标记有子节点，供显示展开徽标

    // a 的子连线消失，但 root→a / root→b 仍在
    expect(collapsed.edges.some((e) => e.fromId === 'a')).toBe(false)
    expect(collapsed.edges.some((e) => e.fromId === 'root' && e.toId === 'a')).toBe(true)
    expect(collapsed.edges.some((e) => e.fromId === 'root' && e.toId === 'b')).toBe(true)

    // 行数从 3 叶子(a1,a2,b) 降到 2 行(a,b) → 高度变小
    expect(collapsed.height).toBeLessThan(full.height)
    expect(collapsed.height).toBe(2 * ROW_PITCH - MIND_V_GAP)
  })
})
