/**
 * # ChronicleTooltip — 编年时间轴悬浮详情卡片（浅色版）
 */

import { useState } from 'react'
import { X, Pencil, Trash2 } from 'lucide-react'
import { useChronicleStore } from '@/stores/chronicleStore'
import type { ChroniclePhase, ChronicleTask } from '@/domain/chronicle'
import { resolveColorHex } from '@/domain/chronicle'

interface Props {
  item: ChroniclePhase | ChronicleTask
  pos: { x: number; y: number }
  onClose: () => void
  onEdit: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'rgba(0,0,0,0.2)',
  in_progress: '#D4A44A',
  done: '#2D7D46',
}

export function ChronicleTooltip({ item, pos, onClose, onEdit }: Props) {
  const deletePhase = useChronicleStore((s) => s.deletePhase)
  const deleteTask = useChronicleStore((s) => s.deleteTask)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const hex = resolveColorHex(item.color)

  const style: React.CSSProperties = {
    position: 'absolute',
    left: Math.min(pos.x + 14, window.innerWidth - 280),
    top: Math.min(pos.y - 10, window.innerHeight - 240),
    zIndex: 100,
  }

  const phase = 'startDate' in item && !('status' in item) ? (item as ChroniclePhase) : null
  const task = 'status' in item ? (item as ChronicleTask) : null

  const handleDelete = async () => {
    if (phase) await deletePhase(phase.id)
    else if (task) await deleteTask(task.id)
    onClose()
  }

  return (
    <div className="chronicle-tooltip" style={style}>
      <style>{TOOLTIP_CSS}</style>

      <div className="chronicle-tooltip-header">
        <span
          className="chronicle-tooltip-dot"
          style={{ backgroundColor: hex }}
        />
        <span className="chronicle-tooltip-type">
          {phase ? '阶段' : '任务'}
        </span>
        <div className="chronicle-tooltip-actions">
          <button className="chronicle-tooltip-action" onClick={onEdit} title="编辑">
            <Pencil size={12} />
          </button>
          {confirmDelete ? (
            <div className="chronicle-tooltip-delete-confirm">
              <button
                className="chronicle-tooltip-action chronicle-tooltip-action-danger"
                onClick={handleDelete}
                title="确认删除"
              >
                确认
              </button>
              <button
                className="chronicle-tooltip-action"
                onClick={() => setConfirmDelete(false)}
                title="取消"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              className="chronicle-tooltip-action chronicle-tooltip-action-delete"
              onClick={() => setConfirmDelete(true)}
              title="删除"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button className="chronicle-tooltip-action" onClick={onClose} title="关闭">
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="chronicle-tooltip-title">{item.title}</div>

      {phase && (
        <div className="chronicle-tooltip-meta">
          {formatDate(phase.startDate)} — {formatDate(phase.endDate)}
        </div>
      )}

      {task && (
        <>
          <div className="chronicle-tooltip-meta">
            {task.startDate && task.endDate
              ? `${formatDate(task.startDate)} — ${formatDate(task.endDate)}`
              : formatDate(task.date)}
          </div>
          <div className="chronicle-tooltip-status">
            <span
              className="chronicle-tooltip-status-dot"
              style={{ backgroundColor: STATUS_COLORS[task.status] }}
            />
            {STATUS_LABELS[task.status] || task.status}
          </div>
          {task.description && (
            <div className="chronicle-tooltip-desc">{task.description}</div>
          )}
        </>
      )}
    </div>
  )
}

const TOOLTIP_CSS = `
.chronicle-tooltip {
  background: var(--surface-raised, #FBFAF6);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-subtle, #e2ddd5);
  border-radius: 10px;
  padding: 12px 14px;
  min-width: 220px;
  max-width: 270px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  color: var(--text-primary, #28241f);
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.chronicle-tooltip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.chronicle-tooltip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chronicle-tooltip-type {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary, #a09894);
}

.chronicle-tooltip-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  align-items: center;
}

.chronicle-tooltip-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #a09894);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-size: 11px;
}
.chronicle-tooltip-action:hover {
  background: var(--surface-base, #F1EBE0);
  color: var(--text-primary, #28241f);
}

.chronicle-tooltip-action-delete:hover {
  background: rgba(181,53,53,0.08);
  color: #B53535;
}

.chronicle-tooltip-action-danger {
  color: #B53535;
  font-weight: 600;
  width: auto;
  padding: 0 6px;
}
.chronicle-tooltip-action-danger:hover {
  background: rgba(181,53,53,0.12);
}

.chronicle-tooltip-delete-confirm {
  display: flex;
  align-items: center;
  gap: 2px;
}

.chronicle-tooltip-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
  color: var(--text-primary, #28241f);
}

.chronicle-tooltip-meta {
  font-size: 11px;
  color: var(--text-secondary, #6b6460);
  margin-bottom: 4px;
}

.chronicle-tooltip-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary, #6b6460);
  margin-bottom: 4px;
}

.chronicle-tooltip-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.chronicle-tooltip-desc {
  font-size: 11px;
  color: var(--text-tertiary, #a09894);
  line-height: 1.4;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-subtle, #e2ddd5);
}
`
