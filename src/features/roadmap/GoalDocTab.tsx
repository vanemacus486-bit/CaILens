/**
 * # GoalDocTab — 目标自由文档区
 *
 * 一篇目标下可攒任意多篇文档（标题 + 正文）。读态把正文按轻量 Markdown
 * 渲染出层次（标题/列表/粗斜/代码），过长自动折叠；卡片带项目分类色细条与
 * 「更新于…」脚注。点开切 textarea 编辑，失焦保存。双列瀑布流铺满工作区。
 * 数据存 Goal.doc.notes（denormalized），旧版三段框架读取时折成文档。
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
  type FocusEvent,
  type CSSProperties,
} from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import type { GoalNote } from '@/domain/goalDoc'
import { normalizeGoalDoc } from '@/domain/goalDoc'
import { parseDocMarkdown, type MdSpan, type MdBlock } from '@/domain/docMarkdown'

interface GoalDocTabProps {
  goal: Goal
  onAddNote: (goalId: string) => Promise<string>
  onUpdateNote: (goalId: string, noteId: string, patch: { title?: string; body?: string }) => Promise<void>
  onRemoveNote: (goalId: string, noteId: string) => Promise<void>
}

// 读态正文超过此高度（px）则折叠
const CLAMP_PX = 260

// ── 渲染辅助 ──────────────────────────────────────────────────
function renderInline(spans: MdSpan[]) {
  return spans.map((s, i) => {
    if (s.code) return <code key={i} className="rm-md-code">{s.text}</code>
    if (s.bold) return <strong key={i}>{s.text}</strong>
    if (s.italic) return <em key={i}>{s.text}</em>
    return <Fragment key={i}>{s.text}</Fragment>
  })
}

function renderBlocks(blocks: MdBlock[]) {
  return blocks.map((b, i) => {
    if (b.type === 'heading') {
      return b.level === 2 ? (
        <h4 key={i} className="rm-md-h rm-md-h2">{renderInline(b.spans)}</h4>
      ) : (
        <h5 key={i} className="rm-md-h rm-md-h3">{renderInline(b.spans)}</h5>
      )
    }
    if (b.type === 'list') {
      const items = b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)
      return b.ordered ? (
        <ol key={i} className="rm-md-list">{items}</ol>
      ) : (
        <ul key={i} className="rm-md-list">{items}</ul>
      )
    }
    return (
      <p key={i} className="rm-note-p">
        {b.lines.map((ln, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {renderInline(ln)}
          </Fragment>
        ))}
      </p>
    )
  })
}

function formatNoteDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, now)) return '今天'
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (sameDay(d, yest)) return '昨天'
  const md = `${d.getMonth() + 1}月${d.getDate()}日`
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}年${md}`
}

// ── 单篇文档卡 ────────────────────────────────────────────────
interface NoteCardProps {
  note: GoalNote
  autoFocus: boolean
  onSave: (patch: { title?: string; body?: string }) => void
  onRemove: () => void
}

function NoteCard({ note, autoFocus, onSave, onRemove }: NoteCardProps) {
  // 新建的卡片直接进编辑态；已有文档默认读态，点开才编辑
  const [editing, setEditing] = useState(autoFocus)
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [confirmDel, setConfirmDel] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // 外部值同步靠按 goal+noteId 重挂载（见主组件 key），编辑期内不回灌，避免覆盖草稿。
  const resize = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])
  useEffect(() => {
    if (editing) resize()
  }, [body, editing, resize])

  // 进入编辑态聚焦：新建聚焦标题，点开已有聚焦正文末尾
  useEffect(() => {
    if (!editing) return
    const t = setTimeout(() => {
      if (autoFocus) {
        titleRef.current?.focus()
      } else if (bodyRef.current) {
        const el = bodyRef.current
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    }, 0)
    return () => clearTimeout(t)
  }, [editing, autoFocus])

  // 量正文高度决定是否折叠：callback ref，正文变了靠 key 重挂载即重量（不在 effect 里 setState）
  const measureProse = useCallback((el: HTMLDivElement | null) => {
    if (el) setOverflowing(el.scrollHeight > CLAMP_PX + 16)
  }, [])

  const saveTitle = () => {
    if (title.trim() !== note.title.trim()) onSave({ title: title.trim() })
  }
  const saveBody = () => {
    if (body !== note.body) onSave({ body })
  }

  // 焦点离开整张卡 → 退出编辑、收起删除确认（保存已由各字段 onBlur 完成）
  const handleCardBlur = (e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setEditing(false)
    setConfirmDel(false)
  }

  // 空文档（无标题无正文）直接删，无需确认
  const isEmpty = title.trim() === '' && body.trim() === ''
  const handleDelClick = () => {
    if (isEmpty) onRemove()
    else setConfirmDel(true)
  }

  return (
    <section
      className={`rm-note${editing ? ' rm-note-editing' : ''}`}
      onBlur={editing ? handleCardBlur : undefined}
    >
      {confirmDel ? (
        <div className="rm-note-confirm">
          <span>删除整篇？</span>
          <button
            className="rm-note-confirm-btn rm-note-confirm-del"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRemove}
          >
            删除
          </button>
          <button
            className="rm-note-confirm-btn rm-note-confirm-keep"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setConfirmDel(false)}
          >
            留着
          </button>
        </div>
      ) : (
        <button
          className="rm-note-del"
          title="删除这篇文档"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleDelClick}
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      )}

      {editing ? (
        <>
          <input
            ref={titleRef}
            className="rm-note-title"
            value={title}
            placeholder="无标题文档"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                bodyRef.current?.focus()
              }
            }}
          />
          <textarea
            ref={bodyRef}
            className="rm-note-body"
            value={body}
            placeholder="写点什么——支持 ## 小标题、- 列表、**加粗**…记什么都行"
            rows={1}
            onChange={(e) => setBody(e.target.value)}
            onBlur={saveBody}
          />
        </>
      ) : (
        <div className="rm-note-read" onClick={() => setEditing(true)}>
          <h3 className={`rm-note-title-view${title.trim() ? '' : ' rm-note-untitled'}`}>
            {title.trim() || '无标题文档'}
          </h3>
          {body.trim() ? (
            <>
              <div
                key={body}
                ref={measureProse}
                className={`rm-note-prose${overflowing && !expanded ? ' rm-note-prose-clamped' : ''}`}
              >
                {renderBlocks(parseDocMarkdown(body))}
              </div>
              {overflowing && (
                <button
                  className="rm-note-expand"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded((v) => !v)
                  }}
                >
                  {expanded ? '收起' : '展开全文'}
                </button>
              )}
            </>
          ) : (
            <p className="rm-note-empty-hint">空文档 · 点击编辑</p>
          )}
          <div className="rm-note-foot">更新于 {formatNoteDate(note.updatedAt)}</div>
        </div>
      )}
    </section>
  )
}

// ── 主组件 ────────────────────────────────────────────────────
export function GoalDocTab({ goal, onAddNote, onUpdateNote, onRemoveNote }: GoalDocTabProps) {
  const notes = normalizeGoalDoc(goal.doc).notes
  // 新建文档的 id（uuid，全局唯一）—— 用它标记自动聚焦的那张卡。
  const [focusId, setFocusId] = useState<string | null>(null)
  // 文档卡用所属目标的分类色做细条；无分类回落默认 accent
  const accent = goal.categoryId ? `var(--event-${goal.categoryId}-fill)` : 'var(--accent)'

  const handleAdd = async () => {
    const id = await onAddNote(goal.id)
    if (id) setFocusId(id)
  }

  return (
    <div className="rm-doc" style={{ '--rm-note-accent': accent } as CSSProperties}>
      {notes.length === 0 ? (
        <div className="rm-doc-empty">
          <p className="rm-doc-empty-text">
            这里是「{goal.title}」的文档区。
            <br />
            记什么都行——资料链接、错题本、想法、复盘…一篇一篇地攒。
          </p>
        </div>
      ) : (
        <div className="rm-doc-board">
          {notes.map((n) => (
            <NoteCard
              key={`${goal.id}:${n.id}`}
              note={n}
              autoFocus={n.id === focusId}
              onSave={(patch) => onUpdateNote(goal.id, n.id, patch)}
              onRemove={() => onRemoveNote(goal.id, n.id)}
            />
          ))}
        </div>
      )}

      <button className="rm-doc-add" onClick={handleAdd}>
        <Plus size={15} strokeWidth={2} />
        新建文档
      </button>
    </div>
  )
}
