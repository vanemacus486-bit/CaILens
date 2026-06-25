import { describe, it, expect } from 'vitest'
import { parseInline, parseDocMarkdown } from '../docMarkdown'

describe('parseInline', () => {
  it('纯文本 → 单个 span', () => {
    expect(parseInline('普通文字')).toEqual([{ text: '普通文字' }])
  })
  it('**粗体**', () => {
    expect(parseInline('考试 **130分钟** 结束')).toEqual([
      { text: '考试 ' },
      { text: '130分钟', bold: true },
      { text: ' 结束' },
    ])
  })
  it('*斜体* 与 _斜体_', () => {
    expect(parseInline('*重点*')).toEqual([{ text: '重点', italic: true }])
    expect(parseInline('_强调_')).toEqual([{ text: '强调', italic: true }])
  })
  it('`代码`', () => {
    expect(parseInline('用 `aws s3 ls` 看桶')).toEqual([
      { text: '用 ' },
      { text: 'aws s3 ls', code: true },
      { text: ' 看桶' },
    ])
  })
  it('** 优先于 *（不会被拆成两个斜体）', () => {
    expect(parseInline('**很重要**')).toEqual([{ text: '很重要', bold: true }])
  })
  it('未闭合记号按字面文本', () => {
    expect(parseInline('单个 * 星号')).toEqual([{ text: '单个 * 星号' }])
  })
})

describe('parseDocMarkdown', () => {
  it('## / ### 标题', () => {
    const blocks = parseDocMarkdown('## 题目类型\n### 子项')
    expect(blocks).toEqual([
      { type: 'heading', level: 2, spans: [{ text: '题目类型' }] },
      { type: 'heading', level: 3, spans: [{ text: '子项' }] },
    ])
  })

  it('连续 - 行归一个无序列表', () => {
    const blocks = parseDocMarkdown('- 业务场景题\n- 多选题')
    expect(blocks).toEqual([
      { type: 'list', ordered: false, items: [[{ text: '业务场景题' }], [{ text: '多选题' }]] },
    ])
  })

  it('连续 1. 行归一个有序列表', () => {
    const blocks = parseDocMarkdown('1. 打地基\n2. 核心服务')
    expect(blocks).toEqual([
      { type: 'list', ordered: true, items: [[{ text: '打地基' }], [{ text: '核心服务' }]] },
    ])
  })

  it('无序与有序相邻 → 拆成两个列表', () => {
    const blocks = parseDocMarkdown('- a\n1. b')
    expect(blocks.map((b) => b.type === 'list' && b.ordered)).toEqual([false, true])
  })

  it('段落内单换行 = 软换行（多行归一段）', () => {
    const blocks = parseDocMarkdown('第一行\n第二行')
    expect(blocks).toEqual([
      { type: 'paragraph', lines: [[{ text: '第一行' }], [{ text: '第二行' }]] },
    ])
  })

  it('空行分段', () => {
    const blocks = parseDocMarkdown('段一\n\n段二')
    expect(blocks).toEqual([
      { type: 'paragraph', lines: [[{ text: '段一' }]] },
      { type: 'paragraph', lines: [[{ text: '段二' }]] },
    ])
  })

  it('混排：标题 + 列表 + 段落', () => {
    const blocks = parseDocMarkdown('## 考点\n- VPC\n- IAM\n\n务必设好 **账单告警**')
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'list', 'paragraph'])
    const para = blocks[2]
    expect(para.type === 'paragraph' && para.lines[0]).toEqual([
      { text: '务必设好 ' },
      { text: '账单告警', bold: true },
    ])
  })

  it('旧式 “1) 题目” 不被当列表，按普通段落（向后兼容）', () => {
    const blocks = parseDocMarkdown('1) 题目类型')
    expect(blocks).toEqual([
      { type: 'paragraph', lines: [[{ text: '1) 题目类型' }]] },
    ])
  })

  it('空正文 → 空块数组', () => {
    expect(parseDocMarkdown('')).toEqual([])
    expect(parseDocMarkdown('\n\n')).toEqual([])
  })
})
