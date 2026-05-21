import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useContextStore } from '@/stores/contextStore'

// ── 样式 ──────────────────────────────────────────────────────

const labelCls = 'text-xs font-sans text-text-secondary mb-1'
const inputCls =
  'w-full font-sans text-sm text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-3 py-1.5 focus:border-border-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 transition-colors duration-150 placeholder:text-text-tertiary'

const sliderCls =
  'w-full h-2 appearance-none bg-surface-sunken rounded-full cursor-pointer ' +
  'accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent'

// ── Props ─────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── 情绪/社交/运动 标签 ─────────────────────────────────────

const INTENSITY_LABELS_ZH = ['很低', '较低', '适中', '较高', '很高']
const INTENSITY_LABELS_EN = ['Very low', 'Low', 'Moderate', 'High', 'Very high']
const MOOD_LABELS_ZH = ['低落', '偏低', '平稳', '不错', '很好']
const MOOD_LABELS_EN = ['Low', 'Down', 'OK', 'Good', 'Great']

// ── 组件 ─────────────────────────────────────────────────────

export function DailyContextDialog({ open, onOpenChange }: Props) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useCallback((zh: string, en: string) => language === 'zh' ? zh : en, [language])
  const { isTodayRecorded, checkToday, upsertToday } = useContextStore()

  // ── 表单状态 ───────────────────────────────────────────
  const [lastMealTime, setLastMealTime] = useState('')
  const [lastMealType, setLastMealType] = useState('')
  const [socialIntensity, setSocialIntensity] = useState(3)
  const [outdoorMinutes, setOutdoorMinutes] = useState('')
  const [exerciseIntensity, setExerciseIntensity] = useState(1)
  const [mood, setMood] = useState(3)
  const [screenHours, setScreenHours] = useState('')
  const [specialNote, setSpecialNote] = useState('')
  const [saving, setSaving] = useState(false)

  // 打开时重置并检查当天状态
  useEffect(() => {
    if (open) {
      checkToday()
      resetForm()
    }
  }, [open, checkToday])

  function resetForm() {
    setLastMealTime('')
    setLastMealType('')
    setSocialIntensity(3)
    setOutdoorMinutes('')
    setExerciseIntensity(1)
    setMood(3)
    setScreenHours('')
    setSpecialNote('')
  }

  const hasChanges =
    lastMealTime || lastMealType ||
    socialIntensity !== 3 ||
    outdoorMinutes || exerciseIntensity !== 1 ||
    mood !== 3 || screenHours || specialNote

  const handleSave = async () => {
    if (!hasChanges) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    try {
      // 将 24h 时间字符串转为 UTC 时间戳（以今天为基准）
      let mealTs: number | undefined
      if (lastMealTime) {
        const [h, m] = lastMealTime.split(':').map(Number)
        const d = new Date()
        d.setHours(h, m, 0, 0)
        mealTs = d.getTime()
      }

      await upsertToday({
        lastMealTime: mealTs,
        lastMealType: lastMealType || undefined,
        socialIntensity: socialIntensity as 1 | 2 | 3 | 4 | 5,
        outdoorMinutes: outdoorMinutes ? Number(outdoorMinutes) : undefined,
        exerciseIntensity: exerciseIntensity as 1 | 2 | 3 | 4 | 5,
        mood: mood as 1 | 2 | 3 | 4 | 5,
        screenHours: screenHours ? Number(screenHours) : undefined,
        specialNote: specialNote || undefined,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const intensityLabel = (v: number, labels: string[]) =>
    labels[Math.min(v, 5) - 1] ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">
          {t('每日生活上下文', 'Daily Context')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('快速记录今天影响作息的生活变量', 'Quickly log today\'s lifestyle variables')}
        </DialogDescription>

        {/* 标题 */}
        <div className="mb-3">
          <h2 className="font-sans text-base font-medium text-text-primary">
            {isTodayRecorded
              ? t('更新今日记录', 'Update Today\'s Log')
              : t('今日生活记录', 'Today\'s Log')}
          </h2>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">
            {t('约 20 秒 · 只需填你想记的字段', '~20 sec · Only fill what matters')}
          </p>
        </div>

        <div className="space-y-4">
          {/* ── 饮食 ── */}
          <fieldset>
            <legend className={labelCls}>{t('饮食', 'Meal')}</legend>
            <div className="flex gap-2">
              <input
                type="time"
                value={lastMealTime}
                onChange={(e) => setLastMealTime(e.target.value)}
                className={cn(inputCls, 'w-[120px] flex-shrink-0')}
                aria-label={t('最后一餐时间', 'Last meal time')}
              />
              <input
                type="text"
                value={lastMealType}
                onChange={(e) => setLastMealType(e.target.value.slice(0, 30))}
                placeholder={t('如: 晚饭-轻食', 'e.g. dinner-light')}
                className={inputCls}
                aria-label={t('餐食类型', 'Meal type')}
              />
            </div>
          </fieldset>

          {/* ── 社交 ── */}
          <fieldset>
            <legend className={labelCls}>
              {t('社交接触', 'Social')}: {intensityLabel(socialIntensity, language === 'zh' ? INTENSITY_LABELS_ZH : INTENSITY_LABELS_EN)}
            </legend>
            <input
              type="range"
              min={1} max={5} step={1}
              value={socialIntensity}
              onChange={(e) => setSocialIntensity(Number(e.target.value))}
              className={sliderCls}
            />
            <div className="flex justify-between text-[10px] text-text-tertiary font-sans mt-0.5">
              <span>{t('独处', 'Alone')}</span>
              <span>{t('密集社交', 'Heavy')}</span>
            </div>
          </fieldset>

          {/* ── 户外 + 运动 ── */}
          <div className="flex gap-3">
            <fieldset className="flex-1 min-w-0">
              <legend className={labelCls}>{t('户外 (分钟)', 'Outdoor (min)')}</legend>
              <input
                type="number"
                min={0} max={600} step={5}
                value={outdoorMinutes}
                onChange={(e) => setOutdoorMinutes(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </fieldset>
            <fieldset className="flex-1 min-w-0">
              <legend className={labelCls}>{t('屏幕 (小时)', 'Screen (hr)')}</legend>
              <input
                type="number"
                min={0} max={24} step={0.5}
                value={screenHours}
                onChange={(e) => setScreenHours(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </fieldset>
          </div>

          {/* ── 运动 ── */}
          <fieldset>
            <legend className={labelCls}>
              {t('运动强度', 'Exercise')}: {intensityLabel(exerciseIntensity, language === 'zh' ? INTENSITY_LABELS_ZH : INTENSITY_LABELS_EN)}
            </legend>
            <input
              type="range"
              min={1} max={5} step={1}
              value={exerciseIntensity}
              onChange={(e) => setExerciseIntensity(Number(e.target.value))}
              className={sliderCls}
            />
            <div className="flex justify-between text-[10px] text-text-tertiary font-sans mt-0.5">
              <span>{t('无运动', 'None')}</span>
              <span>{t('高强度', 'Intense')}</span>
            </div>
          </fieldset>

          {/* ── 情绪 ── */}
          <fieldset>
            <legend className={labelCls}>
              {t('情绪基调', 'Mood')}: {intensityLabel(mood, language === 'zh' ? MOOD_LABELS_ZH : MOOD_LABELS_EN)}
            </legend>
            <input
              type="range"
              min={1} max={5} step={1}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className={sliderCls}
            />
            <div className="flex justify-between text-[10px] text-text-tertiary font-sans mt-0.5">
              <span>{t('低落', 'Low')}</span>
              <span>{t('很好', 'Great')}</span>
            </div>
          </fieldset>

          {/* ── 特殊标记 ── */}
          <fieldset>
            <legend className={labelCls}>{t('特殊标记', 'Notes')}</legend>
            <textarea
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value.slice(0, 200))}
              placeholder={t('今天有什么值得记下来的事？', 'Anything worth noting today?')}
              rows={2}
              className={cn(inputCls, 'resize-none')}
            />
          </fieldset>
        </div>

        {/* ── 按钮 ── */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t('取消', 'Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (t('保存中…', 'Saving…')) : (
              hasChanges
                ? t('保存', 'Save')
                : t('跳过', 'Skip')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
