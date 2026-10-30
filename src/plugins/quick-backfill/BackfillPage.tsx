import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, Plus, Trash2, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { EVENT_COLORS } from '@/domain/event'
import type { ImportedEvent } from '@/domain/icsImport'
import { useEventStore } from '@/stores/eventStore'
import { showErrorSnackbar } from '@/components/ui/snackbar'
import {
  type BackfillRow,
  continueFrom,
  createInitialRow,
  isRowReady,
  summarize,
  toImportedEvent,
  validateRow,
} from './model'

/**
 * 补记模式。
 *
 * 目标是「一次补一周」，所以它和实时记录不是同一个交互：
 * - 表格而不是卡片：一屏看到今天记了什么、有没有空洞
 * - 每行自带「接续」：上一条结束 = 下一条开始，补记时最常见的动作
 * - 不做实时校验打断输入，只在行内标红 + 底部显示可提交条数
 * - 提交走 `importParsedEvents`，复用已有的批量通道（缓存失效 / 跨窗口广播 / 增量合并）
 */

const fieldClass =
  'rounded-md border border-border-subtle bg-surface-base px-2 py-1 font-mono text-xs text-text-primary outline-none transition-colors duration-150 focus:border-accent'

export function BackfillPage() {
  const navigate = useNavigate()
  const importParsedEvents = useEventStore((s) => s.importParsedEvents)

  const [rows, setRows] = useState<BackfillRow[]>(() => [createInitialRow()])
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const summary = useMemo(() => summarize(rows), [rows])
  const readyCount = summary.count
  const totalRows = rows.length

  const patchRow = useCallback((key: string, patch: Partial<BackfillRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }, [])

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createInitialRow(prev[prev.length - 1]?.date)])
  }, [])

  const addContinued = useCallback((fromKey: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === fromKey)
      if (idx < 0) return prev
      const next = [...prev]
      next.splice(idx + 1, 0, continueFrom(prev[idx]))
      return next
    })
  }, [])

  const duplicateRow = useCallback((key: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key)
      if (idx < 0) return prev
      const src = prev[idx]
      const next = [...prev]
      next.splice(idx + 1, 0, { ...continueFrom(src), title: src.title })
      return next
    })
  }, [])

  const removeRow = useCallback((key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)))
  }, [])

  /** 一键补齐：把每行缺失的日期/时间按上一行接续填上。仅填空，不覆盖用户输入。 */
  const autoChain = useCallback(() => {
    setRows((prev) => {
      const out: BackfillRow[] = []
      for (let i = 0; i < prev.length; i += 1) {
        const row = prev[i]
        const prevRow = out[i - 1]
        if (!prevRow) {
          out.push(row)
          continue
        }
        const chained = continueFrom(prevRow)
        out.push({
          ...row,
          date: row.date || chained.date,
          start: row.start || chained.start,
        })
      }
      return out
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    // 行 → 事件必须成对保留。之前用标题反查 categoryId，两行标题相同、
    // 分类不同时会取到第一行的分类；改成按下标对应（`resolveCategory` 的
    // 第二个参数就是 events 里的下标，而 events 由同一份 rows 过滤而来）。
    const pairs: { row: BackfillRow; event: ImportedEvent }[] = []
    for (const row of rows) {
      if (!isRowReady(row)) continue
      const event = toImportedEvent(row)
      if (!event) continue
      pairs.push({ row, event })
    }
    if (pairs.length === 0) {
      showErrorSnackbar('没有可提交的记录：先填标题和时间')
      return
    }
    setSubmitting(true)
    try {
      await importParsedEvents(
        pairs.map((p) => p.event),
        (_event, index) => pairs[index]?.row.categoryId ?? EVENT_COLORS[0],
      )
      setLastResult(`已记录 ${pairs.length} 条`)
      setRows([createInitialRow()])
    } catch (err) {
      showErrorSnackbar(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }, [importParsedEvents, rows, submitting])

  return (
    <div className="flex h-full flex-col bg-surface-base">
      {/* 顶栏 */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border-subtle px-5 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-text-secondary transition-colors duration-200 hover:bg-surface-sunken hover:text-text-primary"
          aria-label="返回"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-base font-medium text-text-primary">补记</h1>
          <p className="mt-0.5 text-xs text-text-tertiary">
            一次补多条。时间早于开始时间视为跨天。
          </p>
        </div>
        <button
          type="button"
          onClick={autoChain}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-subtle bg-transparent px-2.5 py-1.5 text-xs text-text-secondary transition-colors duration-200 hover:bg-surface-sunken hover:text-text-primary"
          title="用上一行的结束时间填下一行的开始时间"
        >
          <Wand2 size={13} strokeWidth={1.75} />
          自动接续
        </button>
      </div>

      {/* 行列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-1.5 px-5 py-4">
          {rows.map((row, index) => {
            const issues = validateRow(row)
            const hasIssue = issues.length > 0
            return (
              <div
                key={row.key}
                className={cn(
                  'flex flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-2 transition-colors duration-200',
                  hasIssue ? 'border-color-text-danger/30 bg-surface-raised' : 'border-border-subtle bg-surface-raised/50',
                )}
              >
                <span className="w-5 shrink-0 font-mono text-xs text-text-quaternary">{index + 1}</span>

                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => patchRow(row.key, { date: e.target.value })}
                  className={cn(fieldClass, 'w-[7.5rem]')}
                  aria-label="日期"
                />
                <input
                  type="time"
                  value={row.start}
                  onChange={(e) => patchRow(row.key, { start: e.target.value })}
                  className={cn(fieldClass, 'w-[5rem]')}
                  aria-label="开始时间"
                />
                <span className="text-text-quaternary">–</span>
                <input
                  type="time"
                  value={row.end}
                  onChange={(e) => patchRow(row.key, { end: e.target.value })}
                  className={cn(fieldClass, 'w-[5rem]')}
                  aria-label="结束时间"
                />

                <input
                  type="text"
                  value={row.title}
                  placeholder="做了什么"
                  onChange={(e) => patchRow(row.key, { title: e.target.value })}
                  className={cn(fieldClass, 'min-w-[8rem] flex-1 font-sans')}
                  aria-label="标题"
                />

                <div className="flex shrink-0 items-center gap-0.5">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => patchRow(row.key, { categoryId: c })}
                      className={cn(
                        'h-5 w-5 cursor-pointer rounded-full border-none transition-transform duration-150',
                        row.categoryId === c ? 'scale-110 ring-2 ring-offset-1 ring-offset-surface-raised' : 'opacity-55 hover:opacity-90',
                      )}
                      style={{ backgroundColor: `var(--event-${c}-fill)`, boxShadow: row.categoryId === c ? '0 0 0 1px var(--border-default)' : undefined }}
                      aria-label={`分类 ${c}`}
                      aria-pressed={row.categoryId === c}
                    />
                  ))}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => addContinued(row.key)}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-tertiary transition-colors duration-150 hover:bg-surface-sunken hover:text-text-primary"
                    title="在此行后接续一条"
                  >
                    <Plus size={13} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateRow(row.key)}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-tertiary transition-colors duration-150 hover:bg-surface-sunken hover:text-text-primary"
                    title="复制此行并接续"
                  >
                    <Copy size={12} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length <= 1}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-tertiary transition-colors duration-150 hover:bg-color-text-danger/10 hover:text-color-text-danger disabled:cursor-not-allowed disabled:opacity-30"
                    title="删除此行"
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                  </button>
                </div>

                {hasIssue && (
                  <p className="w-full pl-6 text-xs text-color-text-danger">{issues[0].message}</p>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={addRow}
            className="mt-1 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle bg-transparent px-3 py-2 text-xs text-text-tertiary transition-colors duration-200 hover:border-border-default hover:text-text-secondary"
          >
            <Plus size={13} strokeWidth={2} />
            添加一行
          </button>
        </div>
      </div>

      {/* 底部汇总 + 提交 */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border-subtle px-5 py-3">
        <div className="min-w-0 flex-1 text-xs text-text-tertiary">
          {readyCount > 0 ? (
            <>
              可提交 <span className="font-mono text-text-primary">{readyCount}</span> 条
              {' · '}
              共 <span className="font-mono text-text-primary">{(summary.totalMs / 3_600_000).toFixed(1)}</span> 小时
              {readyCount < totalRows && ` · ${totalRows - readyCount} 行待完善`}
            </>
          ) : (
            '填上标题与时间后即可提交'
          )}
          {lastResult && <span className="ml-2 text-color-text-success">{lastResult}</span>}
        </div>
        <button
          type="button"
          onClick={() => { void handleSubmit() }}
          disabled={submitting || readyCount === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Check size={14} strokeWidth={2} />
          {submitting ? '提交中…' : `记录 ${readyCount || ''}`.trim()}
        </button>
      </div>
    </div>
  )
}

export default BackfillPage
