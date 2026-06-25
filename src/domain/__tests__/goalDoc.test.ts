import { describe, it, expect } from 'vitest'
import { emptyGoalDoc, makeNote, isGoalDocEmpty, normalizeGoalDoc, type GoalDoc } from '../goalDoc'

describe('emptyGoalDoc', () => {
  it('返回空文档列表', () => {
    expect(emptyGoalDoc()).toEqual({ notes: [] })
  })
  it('每次返回新对象（notes 不共享引用）', () => {
    expect(emptyGoalDoc().notes).not.toBe(emptyGoalDoc().notes)
  })
})

describe('makeNote', () => {
  it('携带 id/createdAt/updatedAt 并裁剪标题首尾空白', () => {
    const n = makeNote('n1', 1000, '  备考资料  ', '链接清单')
    expect(n).toEqual({ id: 'n1', title: '备考资料', body: '链接清单', createdAt: 1000, updatedAt: 1000 })
  })
  it('正文保留原始换行与缩进（不裁剪）', () => {
    expect(makeNote('n2', 1, 't', '  缩进\n第二行  ').body).toBe('  缩进\n第二行  ')
  })
  it('标题/正文默认空', () => {
    expect(makeNote('n3', 5)).toEqual({ id: 'n3', title: '', body: '', createdAt: 5, updatedAt: 5 })
  })
})

describe('isGoalDocEmpty', () => {
  it('undefined / null 视为空', () => {
    expect(isGoalDocEmpty(undefined)).toBe(true)
    expect(isGoalDocEmpty(null)).toBe(true)
  })
  it('无文档视为空', () => {
    expect(isGoalDocEmpty(emptyGoalDoc())).toBe(true)
  })
  it('文档仅空白字符仍视为空', () => {
    const doc: GoalDoc = { notes: [makeNote('a', 1, '   ', '\n\t')] }
    expect(isGoalDocEmpty(doc)).toBe(true)
  })
  it('有标题不为空', () => {
    expect(isGoalDocEmpty({ notes: [makeNote('a', 1, '错题本', '')] })).toBe(false)
  })
  it('仅有正文也不为空', () => {
    expect(isGoalDocEmpty({ notes: [makeNote('a', 1, '', '随手记一句')] })).toBe(false)
  })
})

describe('normalizeGoalDoc', () => {
  it('已是新版结构则原样返回 notes', () => {
    const doc: GoalDoc = { notes: [makeNote('a', 1, '标题', '正文')] }
    expect(normalizeGoalDoc(doc)).toEqual(doc)
  })
  it('空 notes 数组保持为空', () => {
    expect(normalizeGoalDoc({ notes: [] })).toEqual({ notes: [] })
  })
  it('undefined / null → 空文档', () => {
    expect(normalizeGoalDoc(undefined)).toEqual({ notes: [] })
    expect(normalizeGoalDoc(null)).toEqual({ notes: [] })
  })

  describe('旧版三段框架迁移', () => {
    it('why → 一篇「为什么做这个目标」文档', () => {
      const { notes } = normalizeGoalDoc({ why: '为了上线', results: '', attempts: [] }, 1000)
      expect(notes).toEqual([
        { id: 'legacy-why', title: '为什么做这个目标', body: '为了上线', createdAt: 1000, updatedAt: 1000 },
      ])
    })
    it('results → 一篇「取得了什么结果」文档', () => {
      const { notes } = normalizeGoalDoc({ why: '', results: '已发布 v1', attempts: [] }, 1000)
      expect(notes).toEqual([
        { id: 'legacy-results', title: '取得了什么结果', body: '已发布 v1', createdAt: 1000, updatedAt: 1000 },
      ])
    })
    it('attempts → 一篇汇总文档，取最早 createdAt 作时间戳', () => {
      const { notes } = normalizeGoalDoc({
        why: '',
        results: '',
        attempts: [
          { id: 'a1', what: '改用番茄钟', effect: '专注提升', createdAt: 3000 },
          { id: 'a2', what: '早起', effect: '', createdAt: 2000 },
        ],
      })
      expect(notes).toHaveLength(1)
      expect(notes[0]).toMatchObject({
        id: 'legacy-attempts',
        title: '试过什么 · 效果如何',
        body: '• 改用番茄钟\n  专注提升\n\n• 早起',
        createdAt: 2000,
      })
    })
    it('三段齐全 → 三篇文档，顺序为 why/results/attempts', () => {
      const { notes } = normalizeGoalDoc({
        why: '动机',
        results: '产出',
        attempts: [{ id: 'a1', what: '试了X', effect: 'Y', createdAt: 5 }],
      }, 9)
      expect(notes.map((n) => n.id)).toEqual(['legacy-why', 'legacy-results', 'legacy-attempts'])
    })
    it('三段全空 → 空文档（不产生噪声文档）', () => {
      expect(normalizeGoalDoc({ why: '  ', results: '', attempts: [] })).toEqual({ notes: [] })
    })
    it('迁移是幂等的：再归一一次结果不变', () => {
      const once = normalizeGoalDoc({ why: '动机', results: '', attempts: [] }, 7)
      expect(normalizeGoalDoc(once, 99)).toEqual(once)
    })
  })
})
