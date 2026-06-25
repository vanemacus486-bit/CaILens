/**
 * # docMarkdown — 文档轻量 Markdown 解析
 *
 * 把文档正文解析成块结构，供读态渲染出层次感。刻意只支持一小撮语法，
 * 自研零依赖，纯函数（无 React/DOM）：
 * - `## 标题` / `### 小标题` → 标题（2/3 级）
 * - `- 项` / `* 项` → 无序列表；`1. 项` → 有序列表（连续行归一组）
 * - 段落：连续非空行，组内单换行视为软换行
 * - 行内：`**粗**`、`*斜*` / `_斜_`、`` `代码` ``
 *
 * 不支持的语法（如 `1) 题目`）按普通文本呈现 —— 旧文档零改动也能正常显示。
 */

export interface MdSpan {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

export type MdBlock =
  | { type: 'heading'; level: 2 | 3; spans: MdSpan[] }
  | { type: 'list'; ordered: boolean; items: MdSpan[][] }
  | { type: 'paragraph'; lines: MdSpan[][] }

const HEADING = /^(#{2,3})\s+(.+)$/
const BULLET = /^[-*]\s+(.+)$/
const ORDERED = /^\d+\.\s+(.+)$/
// 行内首个特殊记号：代码 > 粗 > 斜（顺序即优先级，避免 ** 被当成两个 *）
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/

/** 解析一行文本的行内样式，返回 span 序列（纯文本则单个 span） */
export function parseInline(text: string): MdSpan[] {
  const spans: MdSpan[] = []
  let rest = text
  while (rest.length > 0) {
    const m = INLINE.exec(rest)
    if (!m) {
      spans.push({ text: rest })
      break
    }
    const idx = m.index
    if (idx > 0) spans.push({ text: rest.slice(0, idx) })
    const tok = m[0]
    if (tok.startsWith('`')) spans.push({ text: tok.slice(1, -1), code: true })
    else if (tok.startsWith('**')) spans.push({ text: tok.slice(2, -2), bold: true })
    else spans.push({ text: tok.slice(1, -1), italic: true })
    rest = rest.slice(idx + tok.length)
  }
  return spans.length > 0 ? spans : [{ text }]
}

/** 解析整篇正文为块序列 */
export function parseDocMarkdown(body: string): MdBlock[] {
  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MdBlock[] = []
  let para: MdSpan[][] | null = null
  let list: { ordered: boolean; items: MdSpan[][] } | null = null

  const flushPara = () => {
    if (para) {
      blocks.push({ type: 'paragraph', lines: para })
      para = null
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items })
      list = null
    }
  }
  const flushAll = () => {
    flushPara()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.trim() === '') {
      flushAll()
      continue
    }

    const h = HEADING.exec(line)
    if (h) {
      flushAll()
      blocks.push({ type: 'heading', level: h[1].length as 2 | 3, spans: parseInline(h[2].trim()) })
      continue
    }

    const b = BULLET.exec(line)
    if (b) {
      flushPara()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list.items.push(parseInline(b[1].trim()))
      continue
    }

    const o = ORDERED.exec(line)
    if (o) {
      flushPara()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push(parseInline(o[1].trim()))
      continue
    }

    // 普通段落行（组内单换行 = 软换行）
    flushList()
    if (!para) para = []
    para.push(parseInline(line.trim()))
  }

  flushAll()
  return blocks
}
