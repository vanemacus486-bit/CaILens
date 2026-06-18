/**
 * # SettingsHygiene — 卫生活动设置
 *
 * 让用户自定义"哪些事件计入卫生 + 染成什么颜色"。
 * 每条 = 图标 + 名称 + 匹配词 + 调色板颜色。卫生时刻图与快速记录都读这份配置。
 */

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { fireAndForget } from '@/lib/fireAndForget'
import { cn } from '@/lib/utils'
import {
  DEFAULT_HYGIENE_ACTIVITIES,
  HYGIENE_PALETTE,
  type HygieneActivityDef,
} from '@/domain/hygieneActivity'

function parseKeywords(s: string): string[] {
  return Array.from(new Set(s.split(/[,，、\s]+/).map((k) => k.trim()).filter(Boolean)))
}

function colorVarOf(key: string): string {
  return `var(${HYGIENE_PALETTE.find((c) => c.key === key)?.varName ?? '--event-sand-fill'})`
}

export function SettingsHygiene() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const setHygieneActivities = useAppSettingsStore((s) => s.setHygieneActivities)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // 本地草稿（函数式更新，避免并发编辑相互覆盖）；初始化自当前设置
  const [draft, setDraft] = useState<HygieneActivityDef[]>(() => {
    const a = useAppSettingsStore.getState().settings.hygieneActivities
    const base = a && a.length ? a : DEFAULT_HYGIENE_ACTIVITIES
    return base.map((x) => ({ ...x, keywords: [...x.keywords] }))
  })

  // 草稿变化即持久化（跳过首次挂载）
  const isFirst = useRef(true)
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    fireAndForget(setHygieneActivities(draft), 'save hygiene activities')
  }, [draft, setHygieneActivities])

  const updateRow = (id: string, patch: Partial<HygieneActivityDef>) =>
    setDraft((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const removeRow = (id: string) => setDraft((prev) => prev.filter((a) => a.id !== id))
  const addRow = () =>
    setDraft((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: t('新活动', 'New activity'), icon: '✨', color: HYGIENE_PALETTE[0].key, keywords: [] },
    ])

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {t('卫生活动', 'Hygiene Activities')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {t(
            '自定义哪些事件计入卫生、染成什么颜色。在日历里记一笔标题含「匹配词」的事件，就会自动计入对应活动。',
            'Define which events count as hygiene and their colors. Logging an event whose title contains a keyword auto-tracks it.',
          )}
        </p>
      </div>

      {/* Activity cards */}
      <div className="flex flex-col gap-3">
        {draft.map((a) => (
          <div key={a.id} className="rounded-lg border border-border-subtle bg-surface-raised p-3 flex flex-col gap-2.5">
            {/* Row 1: icon + name + color preview + delete */}
            <div className="flex items-center gap-2">
              <input
                defaultValue={a.icon}
                maxLength={2}
                onBlur={(e) => updateRow(a.id, { icon: e.target.value.trim() || '·' })}
                aria-label={t('图标', 'Icon')}
                className="w-9 h-9 text-center text-lg rounded-md bg-surface-sunken border border-border-subtle focus:border-border-default focus-visible:outline-none"
              />
              <input
                defaultValue={a.name}
                onBlur={(e) => updateRow(a.id, { name: e.target.value.trim() || t('未命名', 'Untitled') })}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                aria-label={t('名称', 'Name')}
                className="flex-1 min-w-0 text-sm font-sans text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-2.5 py-1.5 focus:border-border-default focus-visible:outline-none"
              />
              <span
                className="w-5 h-5 rounded-full flex-shrink-0 border border-border-subtle"
                style={{ background: colorVarOf(a.color) }}
              />
              <button
                onClick={() => removeRow(a.id)}
                aria-label={t('删除', 'Delete')}
                className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-color-text-danger hover:bg-surface-sunken transition-colors flex-shrink-0 cursor-pointer border-none bg-transparent"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Row 2: keywords */}
            <input
              defaultValue={a.keywords.join('、')}
              onBlur={(e) => updateRow(a.id, { keywords: parseKeywords(e.target.value) })}
              placeholder={t('匹配词，逗号分隔（例：洗澡、shower）', 'Keywords, comma-separated')}
              aria-label={t('匹配词', 'Keywords')}
              className="w-full text-xs font-sans text-text-secondary bg-surface-sunken border border-border-subtle rounded-md px-2.5 py-1.5 focus:border-border-default focus-visible:outline-none placeholder:text-text-tertiary"
            />

            {/* Row 3: palette */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {HYGIENE_PALETTE.map((c) => (
                <button
                  key={c.key}
                  onClick={() => updateRow(a.id, { color: c.key })}
                  aria-label={c.key}
                  className={cn(
                    'w-6 h-6 rounded-full transition-transform cursor-pointer border-none',
                    a.color === c.key
                      ? 'ring-2 ring-offset-2 ring-offset-surface-raised ring-text-secondary scale-110'
                      : 'hover:scale-110',
                  )}
                  style={{ background: `var(${c.varName})` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add */}
      <button
        onClick={addRow}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors py-2.5 text-sm font-sans cursor-pointer bg-transparent"
      >
        <Plus size={16} />
        {t('新增活动', 'Add activity')}
      </button>
    </div>
  )
}
