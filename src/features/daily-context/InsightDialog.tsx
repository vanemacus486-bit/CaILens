import { useState, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useContextStore } from '@/stores/contextStore'
import { useEventStore } from '@/stores/eventStore'
import { analyzeCorrelations, buildDataPoint, formatInsights } from '@/domain/correlation'
import type { DailyDataPoint } from '@/domain/correlation'
import { Brain, AlertCircle, Loader2 } from 'lucide-react'

interface InsightDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InsightDialog({ open, onOpenChange }: InsightDialogProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useCallback((zh: string, en: string) => language === 'zh' ? zh : en, [language])
  const loadRange = useContextStore((s) => s.loadRange)
  const loadAllEvents = useEventStore((s) => s.loadAllEvents)

  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReturnType<typeof analyzeCorrelations> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load events + contexts for last 60 days
      const now = Date.now()
      const cutoff = now - 60 * 86_400_000
      await Promise.all([
        loadRange(cutoff, now),
        loadAllEvents(),
      ])

      // Wait a tick for state to settle
      await new Promise((r) => setTimeout(r, 50))

      const ctxList = useContextStore.getState().contexts
      const events = useEventStore.getState().allEvents

      if (ctxList.length === 0) {
        setError(t('暂无每日上下文数据，请先记录几天。', 'No daily context data yet. Log a few days first.'))
        setLoading(false)
        return
      }

      // Build data points: group events by day, infer sleep times
      const byDay = new Map<number, { startTime: number; endTime: number }[]>()
      for (const e of events) {
        const d = new Date(e.startTime)
        const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        const arr = byDay.get(dayKey) ?? []
        arr.push(e)
        byDay.set(dayKey, arr)
      }

      const points: DailyDataPoint[] = []
      for (const ctx of ctxList) {
        const dayEvents = byDay.get(ctx.date) ?? []
        const sorted = [...dayEvents].sort((a, b) => a.startTime - b.startTime)

        // Infer bedtime/waketime (same logic as steadyMetrics)
        let bedtime: number | null = null
        let wakeTime: number | null = null

        if (sorted.length > 0) {
          const firstHour = new Date(sorted[0].startTime).getHours() + new Date(sorted[0].startTime).getMinutes() / 60
          if (firstHour >= 4 && firstHour <= 12) wakeTime = firstHour

          const last = sorted[sorted.length - 1]
          const lastHour = new Date(last.endTime).getHours() + new Date(last.endTime).getMinutes() / 60
          const normalized = lastHour >= 18 ? lastHour : (lastHour < 6 ? lastHour + 24 : null)
          if (normalized !== null && normalized >= 18 && normalized <= 30) bedtime = normalized
        }

        points.push(buildDataPoint(ctx, bedtime, wakeTime))
      }

      const result = analyzeCorrelations(points, 15)
      setReport(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('分析失败', 'Analysis failed'))
    }
    setLoading(false)
  }

  const insightLines = useMemo(
    () => report ? formatInsights(report, language) : [],
    [report, language],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogTitle className="sr-only">
          {t('生活洞察', 'Insights')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('分析每日生活变量与作息的关系', 'Analyze how lifestyle variables affect your routine')}
        </DialogDescription>

        <div className="flex items-center gap-2 mb-3">
          <Brain size={20} strokeWidth={1.75} className="text-accent" />
          <h2 className="font-sans text-base font-medium text-text-primary">
            {t('生活洞察', 'Lifestyle Insights')}
          </h2>
        </div>

        {!report && !error && !loading && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="font-sans text-sm text-text-tertiary">
              {t('分析每日生活变量（饮食、运动、社交…）与作息指标（就寝、起床、睡眠时长）的关联趋势。', 'Analyze correlations between daily lifestyle variables and your sleep routine.')}
            </p>
            <Button onClick={handleGenerate}>
              <Brain size={16} strokeWidth={1.75} className="mr-1.5" />
              {t('生成洞察', 'Generate Insights')}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="font-sans text-sm text-text-tertiary">
              {t('分析中…', 'Analyzing…')}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 py-4">
            <AlertCircle size={18} strokeWidth={1.75} className="text-color-text-danger flex-shrink-0 mt-0.5" />
            <p className="font-sans text-sm text-text-secondary">{error}</p>
          </div>
        )}

        {report && report.insights.length === 0 && (
          <div className="py-6 text-center">
            <p className="font-sans text-sm text-text-tertiary">
              {t('暂未发现显著关联。数据越多分析越准确，请继续记录。', 'No significant correlations found yet. Keep logging.')}
            </p>
          </div>
        )}

        {insightLines.length > 0 && (
          <div className="space-y-3 py-2">
            {insightLines.map((line, i) => (
              <p key={i} className="font-sans text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {line.startsWith('>')
                  ? <span className="text-text-tertiary italic">{line}</span>
                  : line}
              </p>
            ))}

            {report && report.contextDays < 10 && (
              <p className="font-sans text-xs text-text-tertiary italic mt-4 pt-3 border-t border-border-subtle">
                {t(`仅基于 ${report.contextDays} 天数据，结论仅供参考。`, `Based on ${report.contextDays} days only — for reference.`)}
              </p>
            )}
          </div>
        )}

        {report && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('关闭', 'Close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
