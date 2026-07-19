import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Clock, Copy, MapPin, NotebookText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTodoStore } from '@/stores/todoStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { classifyEvent } from '@/domain/icsImport'
import {
  EVENT_COLORS,
  MEAL_ORDER_LABELS,
  MEAL_SOURCE_LABELS,
  MEAL_TAG_LABELS,
  MEAL_TAG_OPTIONS,
  type CalendarEvent,
  type CreateEventInput,
  type EventColor,
  type MealOrder,
  type MealSource,
  type MealTag,
  type SleepSubType,
  type TypedEventData,
} from '@/domain/event'
import { getCategoryById, type CategoryId } from '@/domain/category'
import { isAllDayEvent } from '@/domain/dayStream'
import { DEFAULT_HYGIENE_ACTIVITIES } from '@/domain/hygieneActivity'
import type { RulerEdge } from '@/domain/timeRuler'
import { TimeRulerPicker } from './TimeRulerPicker'

export interface MobileEditorDefaults {
  startTime: number
  endTime: number
  color?: EventColor
}

interface MobileEventEditorProps {
  open: boolean
  defaults: MobileEditorDefaults
  editingEvent?: CalendarEvent
  onClose: () => void
}

type TypedMode = 'none' | 'sleep' | 'meal' | 'hygiene'

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']
const SLEEP_LABELS: Record<SleepSubType, string> = { main: '主睡眠', nap: '小睡', insomnia: '失眠' }

function tsToTimeStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function timeStrToTs(base: number, timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

function localMidnight(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatEditorDate(ts: number): { relative: string; full: string } {
  const d = new Date(ts)
  const diffDays = Math.round((localMidnight(ts) - localMidnight(Date.now())) / 86_400_000)
  const relative =
    diffDays === 0 ? '今天' :
    diffDays === 1 ? '明天' :
    diffDays === -1 ? '昨天' :
    `周${WEEKDAY_ZH[d.getDay()]}`
  return { relative, full: `${d.getMonth() + 1}月${d.getDate()}日` }
}

function typedModeOf(event?: CalendarEvent): TypedMode {
  return event?.typedData?.type ?? 'none'
}

function defaultMealOrder(ts: number): MealOrder {
  const h = new Date(ts).getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'night_snack'
}

function parseQuality(value: string): 1 | 2 | 3 | 4 | 5 {
  const n = Number(value)
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : 3
}

function makeTypedData(
  mode: TypedMode,
  startTime: number,
  endTime: number,
  sleepType: SleepSubType,
  sleepQuality: number,
  hasAwakening: boolean,
  mealOrder: MealOrder,
  mealSource: MealSource,
  mealTags: MealTag[],
  hygieneActivity: string,
): TypedEventData | undefined {
  if (mode === 'sleep') {
    return {
      type: 'sleep',
      sleepType,
      quality: sleepQuality as 1 | 2 | 3 | 4 | 5,
      hasAwakening,
      bedtime: startTime,
      wakeTime: endTime,
    }
  }
  if (mode === 'meal') {
    return { type: 'meal', mealOrder, source: mealSource, foodTags: mealTags }
  }
  if (mode === 'hygiene') {
    return { type: 'hygiene', activity: hygieneActivity }
  }
  return undefined
}

export function MobileEventEditor({ open, defaults, editingEvent, onClose }: MobileEventEditorProps) {
  const categories = useCategoryStore((s) => s.categories)
  const projects = useProjectStore((s) => s.projects)
  const todos = useTodoStore((s) => s.todos)
  const hygieneActivities = useAppSettingsStore((s) => s.settings.hygieneActivities) ?? DEFAULT_HYGIENE_ACTIVITIES
  const createEvent = useEventStore((s) => s.createEvent)
  const updateEvent = useEventStore((s) => s.updateEvent)
  const deleteEvent = useEventStore((s) => s.deleteEvent)
  const duplicateEvent = useEventStore((s) => s.duplicateEvent)

  const isEditing = !!editingEvent
  const inputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(() => editingEvent?.title ?? '')
  const [color, setColor] = useState<EventColor>(() => editingEvent?.color ?? defaults.color ?? 'accent')
  const [startTime, setStartTime] = useState(() => editingEvent?.startTime ?? defaults.startTime)
  const [endTime, setEndTime] = useState(() => editingEvent?.endTime ?? defaults.endTime)
  const [description, setDescription] = useState(() => editingEvent?.description ?? '')
  const [location, setLocation] = useState(() => editingEvent?.location ?? '')
  const [projectId, setProjectId] = useState(() => editingEvent?.projectId ?? '')
  const [goalId, setGoalId] = useState(() => editingEvent?.goalId ?? '')
  const [typedMode, setTypedMode] = useState<TypedMode>(() => typedModeOf(editingEvent))
  const [sleepType, setSleepType] = useState<SleepSubType>(() => editingEvent?.typedData?.type === 'sleep' ? editingEvent.typedData.sleepType : 'main')
  const [sleepQuality, setSleepQuality] = useState(() => editingEvent?.typedData?.type === 'sleep' ? editingEvent.typedData.quality ?? 3 : 3)
  const [hasAwakening, setHasAwakening] = useState(() => editingEvent?.typedData?.type === 'sleep' ? editingEvent.typedData.hasAwakening ?? false : false)
  const [mealOrder, setMealOrder] = useState<MealOrder>(() => editingEvent?.typedData?.type === 'meal' ? editingEvent.typedData.mealOrder : defaultMealOrder(defaults.startTime))
  const [mealSource, setMealSource] = useState<MealSource>(() => editingEvent?.typedData?.type === 'meal' ? editingEvent.typedData.source : 'home')
  const [mealTags, setMealTags] = useState<MealTag[]>(() => editingEvent?.typedData?.type === 'meal' ? editingEvent.typedData.foodTags : [])
  const [hygieneActivity, setHygieneActivity] = useState(() => editingEvent?.typedData?.type === 'hygiene' ? editingEvent.typedData.activity : hygieneActivities[0]?.id ?? 'shower')
  const [isAllDay, setIsAllDay] = useState(() => editingEvent ? isAllDayEvent(editingEvent, localMidnight(editingEvent.startTime)) : false)
  const [activeEdge, setActiveEdge] = useState<RulerEdge>('start')
  const [precisionMode, setPrecisionMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const goalOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const todo of todos) {
      if (todo.goalId) ids.add(todo.goalId)
    }
    return [...ids]
  }, [todos])

  const category = getCategoryById(categories, color as CategoryId)
  const { relative: dateRelative, full: dateFull } = formatEditorDate(startTime)

  const handleTitleChange = useCallback((v: string) => {
    setTitle(v)
    if (!isEditing) {
      const classified = classifyEvent(v, categories)
      if (classified) setColor(classified as EventColor)
    }
  }, [categories, isEditing])

  const buildInput = useCallback((finalEnd: number): CreateEventInput => {
    const categoryId = color as CategoryId
    const typedData = makeTypedData(
      typedMode,
      startTime,
      finalEnd,
      sleepType,
      sleepQuality,
      hasAwakening,
      mealOrder,
      mealSource,
      mealTags,
      hygieneActivity,
    )
    return {
      title: title.trim(),
      startTime,
      endTime: finalEnd,
      color,
      categoryId,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      projectId: projectId || undefined,
      goalId: goalId || null,
      typedKey: typedData?.type ?? null,
      typedData,
    }
  }, [color, description, goalId, hasAwakening, hygieneActivity, location, mealOrder, mealSource, mealTags, projectId, sleepQuality, sleepType, startTime, title, typedMode])

  const save = useCallback(async (continueAfter = false) => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const finalEnd = endTime <= startTime ? startTime + 30 * 60_000 : endTime
      const input = buildInput(finalEnd)
      if (isEditing && editingEvent) {
        await updateEvent({ id: editingEvent.id, ...input })
      } else {
        await createEvent(input)
      }
      if (continueAfter) {
        setTitle('')
        setStartTime(finalEnd)
        setEndTime(finalEnd + Math.max(30 * 60_000, finalEnd - startTime))
        return
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }, [buildInput, createEvent, editingEvent, endTime, isEditing, onClose, startTime, title, updateEvent])

  const toggleAllDay = useCallback(() => {
    setIsAllDay((prev) => {
      const next = !prev
      if (next) {
        const dayStart = localMidnight(startTime)
        setStartTime(dayStart)
        setEndTime(dayStart + 86_400_000)
      } else {
        setEndTime(startTime + 30 * 60_000)
      }
      return next
    })
  }, [startTime])

  const handleDuplicate = useCallback(async () => {
    if (!editingEvent) return
    setSaving(true)
    try {
      await duplicateEvent(editingEvent.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }, [duplicateEvent, editingEvent, onClose])

  const handleDelete = useCallback(async () => {
    if (!editingEvent) return
    setSaving(true)
    try {
      await deleteEvent(editingEvent.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }, [deleteEvent, editingEvent, onClose])

  return (
    <div className={cn('fixed inset-0 z-50 flex flex-col bg-surface-base transition-transform duration-250 ease-out', open ? 'translate-y-0' : 'translate-y-full')} style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32 flex flex-col gap-5">
        <input ref={inputRef} value={title} onChange={(e) => handleTitleChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void save(false) }} placeholder="做了什么？" className="w-full bg-transparent text-2xl font-medium text-text-primary placeholder:text-text-tertiary outline-none text-center" />

        <div className="flex flex-wrap items-center justify-center gap-2">
          {EVENT_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={cn('w-8 h-8 rounded-full transition-all', color === c && 'ring-2 ring-offset-2 ring-offset-surface-base')} style={{ backgroundColor: `var(--event-${c}-fill)` }} aria-label={c} />
          ))}
        </div>
        <p className="text-center text-xs text-text-tertiary">{category?.name ?? color}</p>

        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary tracking-wide">{dateRelative}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{dateFull}</p>
        </div>

        <div className="flex items-center justify-center gap-3 font-mono">
          <button type="button" onClick={() => setActiveEdge('start')} className={cn('text-4xl font-semibold tabular-nums transition-opacity', activeEdge === 'start' || isAllDay ? 'text-text-primary' : 'text-text-primary/45')}>
            {isAllDay ? '全天' : tsToTimeStr(startTime)}
          </button>
          {!isAllDay && (
            <>
              <span className="text-2xl text-text-tertiary">→</span>
              <button type="button" onClick={() => setActiveEdge('end')} className={cn('text-4xl font-semibold tabular-nums transition-opacity', activeEdge === 'end' ? 'text-text-primary' : 'text-text-primary/45')}>
                {tsToTimeStr(endTime)}
              </button>
            </>
          )}
        </div>

        {!isAllDay && (
          <TimeRulerPicker startTime={startTime} endTime={endTime} activeEdge={activeEdge} onChange={({ startTime: s, endTime: e }) => { setStartTime(s); setEndTime(e) }} />
        )}

        <div className="flex items-center justify-center gap-5">
          <button type="button" onClick={() => setPrecisionMode((v) => !v)} disabled={isAllDay} className={cn('p-2 rounded-full transition-colors disabled:opacity-30', precisionMode ? 'bg-surface-raised text-text-primary' : 'text-text-tertiary')}><Clock size={16} /></button>
          <button type="button" onClick={toggleAllDay} className={cn('p-2 rounded-full transition-colors', isAllDay ? 'bg-surface-raised text-text-primary' : 'text-text-tertiary')}><CalendarDays size={16} /></button>
        </div>

        {precisionMode && !isAllDay && (
          <div className="flex items-center gap-3">
            <input type="time" value={tsToTimeStr(startTime)} onChange={(e) => setStartTime(timeStrToTs(startTime, e.target.value))} className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
            <span className="text-text-tertiary">→</span>
            <input type="time" value={tsToTimeStr(endTime)} onChange={(e) => setEndTime(timeStrToTs(startTime, e.target.value))} className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
          </div>
        )}

        <section className="space-y-3">
          <SegmentLabel icon={<NotebookText size={14} />} label="记录类型" />
          <select value={typedMode} onChange={(e) => setTypedMode(e.target.value as TypedMode)} className="w-full rounded-xl bg-surface-raised px-3 py-3 text-sm text-text-primary outline-none">
            <option value="none">普通事件</option>
            <option value="sleep">睡眠</option>
            <option value="meal">饮食</option>
            <option value="hygiene">卫生</option>
          </select>

          {typedMode === 'sleep' && (
            <div className="grid grid-cols-2 gap-2">
              <select value={sleepType} onChange={(e) => setSleepType(e.target.value as SleepSubType)} className="rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none">
                {Object.entries(SLEEP_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <select value={sleepQuality} onChange={(e) => setSleepQuality(parseQuality(e.target.value))} className="rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>质量 {n}</option>)}
              </select>
              <label className="col-span-2 flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-3 text-sm text-text-secondary">
                <input type="checkbox" checked={hasAwakening} onChange={(e) => setHasAwakening(e.target.checked)} />
                夜间醒来
              </label>
            </div>
          )}

          {typedMode === 'meal' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={mealOrder} onChange={(e) => setMealOrder(e.target.value as MealOrder)} className="rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none">
                  {Object.entries(MEAL_ORDER_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <select value={mealSource} onChange={(e) => setMealSource(e.target.value as MealSource)} className="rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none">
                  {Object.entries(MEAL_SOURCE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {MEAL_TAG_OPTIONS.map((tag) => (
                  <button key={tag} type="button" onClick={() => setMealTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])} className={cn('rounded-full px-3 py-1.5 text-xs', mealTags.includes(tag) ? 'bg-accent text-white' : 'bg-surface-raised text-text-secondary')}>
                    {MEAL_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {typedMode === 'hygiene' && (
            <select value={hygieneActivity} onChange={(e) => setHygieneActivity(e.target.value)} className="w-full rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none">
              {hygieneActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}
            </select>
          )}
        </section>

        <section className="space-y-3">
          <SegmentLabel icon={<MapPin size={14} />} label="关联与备注" />
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none">
            <option value="">不关联项目</option>
            {projects.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="w-full rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none">
            <option value="">不关联目标</option>
            {goalOptions.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地点" className="w-full rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none placeholder:text-text-tertiary" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述 / 备注" rows={3} className="w-full rounded-xl bg-surface-raised px-3 py-3 text-sm outline-none placeholder:text-text-tertiary resize-none" />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3 border-t border-border-subtle bg-surface-base" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
        <button onClick={onClose} className="text-sm text-text-secondary px-2 py-2">取消</button>
        {isEditing && (
          <>
            <button onClick={handleDuplicate} disabled={saving} className="p-2 text-text-secondary disabled:opacity-50" aria-label="复制"><Copy size={17} /></button>
            <button onClick={() => setShowConfirmDelete(true)} disabled={saving} className="text-sm font-medium text-[var(--color-danger)] px-2 py-2 disabled:opacity-50">删除</button>
          </>
        )}
        <div className="flex-1" />
        {!isEditing && (
          <button onClick={() => void save(true)} disabled={saving || !title.trim()} className="text-sm font-semibold text-accent px-2 py-2 disabled:opacity-40">继续</button>
        )}
        <button onClick={() => void save(false)} disabled={saving || !title.trim()} className="text-sm font-semibold text-white bg-accent px-5 py-2.5 rounded-full active:scale-95 transition-all disabled:opacity-40">
          {saving ? '保存中...' : isEditing ? '保存' : '记录'}
        </button>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/40">
          <div className="bg-surface-base rounded-t-2xl w-full px-5 py-6 space-y-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
            <p className="text-center text-sm text-text-secondary">确认删除这条记录？</p>
            <button onClick={handleDelete} disabled={saving} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--color-danger)] active:scale-95 transition-all">确认删除</button>
            <button onClick={() => setShowConfirmDelete(false)} className="w-full py-3 rounded-xl text-sm font-medium text-text-secondary bg-surface-sunken active:scale-95 transition-all">取消</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SegmentLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
      {icon}
      {label}
    </div>
  )
}
