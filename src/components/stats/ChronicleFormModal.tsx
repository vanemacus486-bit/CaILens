/**
 * # ChronicleFormModal — 编年时间轴新增/编辑居中 Modal
 *
 * 使用 Radix Dialog，白色轻量居中弹窗。
 * 根据 mode 显示「添加阶段」或「添加任务」表单。
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useChronicleStore } from '@/stores/chronicleStore'
import { CATEGORY_HEX, type ChroniclePhase, type ChronicleTask, type ChronicleTaskStatus } from '@/domain/chronicle'
import type { CategoryId } from '@/domain/category'

interface Props {
  mode: 'phase' | 'task'
  editingItem: ChroniclePhase | ChronicleTask | null
  onClose: () => void
}

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

const STATUS_OPTIONS: { value: ChronicleTaskStatus; label: string }[] = [
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'done', label: '已完成' },
]

function toDateInputValue(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fromDateInputValue(val: string): number {
  return new Date(val + 'T00:00:00').getTime()
}

export function ChronicleFormModal({ mode, editingItem, onClose }: Props) {
  const addPhase = useChronicleStore((s) => s.addPhase)
  const updatePhase = useChronicleStore((s) => s.updatePhase)
  const deletePhase = useChronicleStore((s) => s.deletePhase)
  const addTask = useChronicleStore((s) => s.addTask)
  const updateTask = useChronicleStore((s) => s.updateTask)
  const deleteTask = useChronicleStore((s) => s.deleteTask)

  const isEdit = editingItem !== null

  // Form state
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [date, setDate] = useState('')
  const [colorKey, setColorKey] = useState<string>('accent')
  const [customColor, setCustomColor] = useState('#BC4A26')
  const [useCustomColor, setUseCustomColor] = useState(false)
  const [status, setStatus] = useState<ChronicleTaskStatus>('todo')
  const [description, setDescription] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Populate from editing item
  useEffect(() => {
    if (!editingItem) {
      const now = new Date()
      setTitle('')
      setStartDate(toDateInputValue(now.getTime()))
      setEndDate(toDateInputValue(now.getTime() + 90 * 24 * 60 * 60_000))
      setDate(toDateInputValue(now.getTime()))
      setColorKey('accent')
      setCustomColor('#BC4A26')
      setUseCustomColor(false)
      setStatus('todo')
      setDescription('')
      setConfirmDelete(false)
      return
    }

    setTitle(editingItem.title)
    if ('startDate' in editingItem && 'endDate' in editingItem && !('status' in editingItem)) {
      const p = editingItem as ChroniclePhase
      setStartDate(toDateInputValue(p.startDate))
      setEndDate(toDateInputValue(p.endDate))
      if (p.categoryId && CATEGORY_IDS.includes(p.categoryId)) {
        setColorKey(p.categoryId)
        setUseCustomColor(false)
      } else {
        setCustomColor(p.color)
        setUseCustomColor(true)
      }
    } else {
      const t = editingItem as ChronicleTask
      setDate(toDateInputValue(t.date))
      setStartDate(t.startDate ? toDateInputValue(t.startDate) : '')
      setEndDate(t.endDate ? toDateInputValue(t.endDate) : '')
      setStatus(t.status)
      setDescription(t.description ?? '')
      if (t.categoryId && CATEGORY_IDS.includes(t.categoryId)) {
        setColorKey(t.categoryId)
        setUseCustomColor(false)
      } else {
        setCustomColor(t.color)
        setUseCustomColor(true)
      }
    }
    setConfirmDelete(false)
  }, [editingItem])

  const resolvedColor = useCustomColor ? customColor : CATEGORY_HEX[colorKey as CategoryId] ?? CATEGORY_HEX.stone

  const handleSubmit = async () => {
    if (!title.trim()) return

    const now = Date.now()
    const color = useCustomColor ? customColor : colorKey
    const categoryId = useCustomColor ? null : (colorKey as CategoryId)

    if (mode === 'phase') {
      const phase: ChroniclePhase = {
        id: editingItem?.id ?? crypto.randomUUID(),
        title: title.trim(),
        startDate: fromDateInputValue(startDate),
        endDate: fromDateInputValue(endDate),
        color,
        categoryId,
        createdAt: (editingItem as ChroniclePhase)?.createdAt ?? now,
        updatedAt: now,
      }
      if (isEdit) {
        await updatePhase(phase.id, phase)
      } else {
        await addPhase(phase)
      }
    } else {
      const task: ChronicleTask = {
        id: editingItem?.id ?? crypto.randomUUID(),
        title: title.trim(),
        date: fromDateInputValue(date),
        startDate: startDate ? fromDateInputValue(startDate) : null,
        endDate: endDate ? fromDateInputValue(endDate) : null,
        color,
        categoryId,
        description: description.trim() || null,
        status,
        createdAt: (editingItem as ChronicleTask)?.createdAt ?? now,
        updatedAt: now,
      }
      if (isEdit) {
        await updateTask(task.id, task)
      } else {
        await addTask(task)
      }
    }

    onClose()
  }

  const handleDelete = async () => {
    if (!editingItem) return
    if (mode === 'phase') {
      await deletePhase(editingItem.id)
    } else {
      await deleteTask(editingItem.id)
    }
    onClose()
  }

  return (
    <div className="chronicle-modal-overlay" onClick={onClose}>
      <style>{MODAL_CSS}</style>
      <div className="chronicle-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chronicle-modal-header">
          <h3 className="chronicle-modal-title">
            {isEdit ? '编辑' : '添加'}{mode === 'phase' ? '阶段' : '任务'}
          </h3>
          <button className="chronicle-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="chronicle-modal-body">
          {/* Title */}
          <label className="chronicle-field">
            <span className="chronicle-field-label">标题</span>
            <input
              className="chronicle-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'phase' ? '如：高中阶段' : '如：攻克微积分'}
              autoFocus
            />
          </label>

          {/* Date fields */}
          {mode === 'phase' ? (
            <>
              <label className="chronicle-field">
                <span className="chronicle-field-label">开始日期</span>
                <input
                  className="chronicle-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="chronicle-field">
                <span className="chronicle-field-label">结束日期</span>
                <input
                  className="chronicle-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="chronicle-field">
                <span className="chronicle-field-label">锚定日期</span>
                <input
                  className="chronicle-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="chronicle-field">
                <span className="chronicle-field-label">开始日期（可选，跨月任务）</span>
                <input
                  className="chronicle-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="chronicle-field">
                <span className="chronicle-field-label">结束日期（可选）</span>
                <input
                  className="chronicle-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <label className="chronicle-field">
                <span className="chronicle-field-label">状态</span>
                <select
                  className="chronicle-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ChronicleTaskStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="chronicle-field">
                <span className="chronicle-field-label">描述</span>
                <textarea
                  className="chronicle-input chronicle-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="可选备注…"
                  rows={2}
                />
              </label>
            </>
          )}

          {/* Color picker */}
          <div className="chronicle-field">
            <span className="chronicle-field-label">颜色</span>
            <div className="chronicle-color-options">
              {CATEGORY_IDS.map((cid) => (
                <button
                  key={cid}
                  type="button"
                  className={`chronicle-color-swatch ${!useCustomColor && colorKey === cid ? 'chronicle-color-swatch-active' : ''}`}
                  style={{ backgroundColor: CATEGORY_HEX[cid] }}
                  onClick={() => { setColorKey(cid); setUseCustomColor(false) }}
                  title={cid}
                />
              ))}
              <button
                type="button"
                className={`chronicle-color-swatch chronicle-color-swatch-custom ${useCustomColor ? 'chronicle-color-swatch-active' : ''}`}
                style={{ backgroundColor: customColor }}
                onClick={() => setUseCustomColor(true)}
                title="自定义"
              >
                +
              </button>
            </div>
            {useCustomColor && (
              <input
                className="chronicle-input"
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                style={{ marginTop: 8, height: 32, padding: 2 }}
              />
            )}
          </div>

          {/* Preview */}
          <div className="chronicle-preview">
            <span
              className="chronicle-preview-swatch"
              style={{ backgroundColor: resolvedColor }}
            />
            <span className="chronicle-preview-label">{title || '(无标题)'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="chronicle-modal-footer">
          {isEdit && (
            confirmDelete ? (
              <div className="chronicle-delete-confirm">
                <span>确认删除？</span>
                <button className="chronicle-btn chronicle-btn-danger" onClick={handleDelete}>
                  确认
                </button>
                <button className="chronicle-btn chronicle-btn-ghost" onClick={() => setConfirmDelete(false)}>
                  取消
                </button>
              </div>
            ) : (
              <button className="chronicle-btn chronicle-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
                删除
              </button>
            )
          )}
          <div className="chronicle-modal-spacer" />
          <button className="chronicle-btn chronicle-btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="chronicle-btn chronicle-btn-primary" onClick={handleSubmit}>
            {isEdit ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}

const MODAL_CSS = `
.chronicle-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(3px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: chronicle-modal-fade-in 0.15s ease-out;
}

@keyframes chronicle-modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.chronicle-modal {
  width: 380px;
  max-width: 92vw;
  max-height: 85vh;
  background: var(--surface-raised, #FBFAF6);
  border: 1px solid var(--border-subtle, #e2ddd5);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  color: var(--text-primary, #28241f);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  box-shadow: 0 12px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
  animation: chronicle-modal-scale-in 0.18s ease-out;
}

@keyframes chronicle-modal-scale-in {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.chronicle-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  flex-shrink: 0;
}

.chronicle-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #28241f);
}

.chronicle-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #a09894);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.chronicle-modal-close:hover {
  background: var(--surface-base, #F1EBE0);
  color: var(--text-primary, #28241f);
}

.chronicle-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chronicle-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chronicle-field-label {
  font-size: 11px;
  color: var(--text-tertiary, #a09894);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.chronicle-input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e2ddd5);
  background: var(--surface-base, #F1EBE0);
  color: var(--text-primary, #28241f);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.chronicle-input:focus {
  border-color: var(--accent, #c47a5a);
  box-shadow: 0 0 0 3px rgba(196,122,90,0.12);
}
.chronicle-input::placeholder {
  color: var(--text-quaternary, #c4c0b8);
}

select.chronicle-input {
  cursor: pointer;
}

.chronicle-textarea {
  resize: vertical;
  min-height: 48px;
}

.chronicle-color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chronicle-color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}
.chronicle-color-swatch:hover {
  transform: scale(1.15);
}
.chronicle-color-swatch-active {
  border-color: var(--text-primary, #28241f);
  box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
}

.chronicle-color-swatch-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-tertiary, #a09894);
  background: var(--surface-base, #F1EBE0) !important;
  border: 2px dashed var(--border-default, #ccc7be);
}

.chronicle-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--surface-base, #F1EBE0);
}

.chronicle-preview-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.chronicle-preview-label {
  font-size: 12px;
  color: var(--text-secondary, #6b6460);
}

.chronicle-modal-footer {
  display: flex;
  align-items: center;
  padding: 12px 22px 18px;
  gap: 8px;
  flex-shrink: 0;
}

.chronicle-modal-spacer {
  flex: 1;
}

.chronicle-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  line-height: 1.3;
  font-weight: 500;
}

.chronicle-btn-primary {
  background: var(--accent, #c47a5a);
  color: #fff;
  border-color: var(--accent, #c47a5a);
}
.chronicle-btn-primary:hover {
  opacity: 0.9;
}

.chronicle-btn-ghost {
  background: transparent;
  color: var(--text-secondary, #6b6460);
  border-color: var(--border-subtle, #e2ddd5);
}
.chronicle-btn-ghost:hover {
  background: var(--surface-base, #F1EBE0);
  color: var(--text-primary, #28241f);
}

.chronicle-btn-danger {
  background: #B53535;
  color: #fff;
  border-color: #B53535;
}
.chronicle-btn-danger:hover {
  opacity: 0.9;
}

.chronicle-btn-danger-ghost {
  background: transparent;
  color: #B53535;
  border-color: transparent;
}
.chronicle-btn-danger-ghost:hover {
  background: rgba(181,53,53,0.08);
}

.chronicle-delete-confirm {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary, #6b6460);
}
`
