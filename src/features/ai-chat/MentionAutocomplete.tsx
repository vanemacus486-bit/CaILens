import { useMemo } from 'react'
import { useCategoryStore } from '@/stores/categoryStore'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { getWeekStart } from '@/domain/time'
import type { EventColor } from '@/domain/event'

export interface MentionSuggestion {
  kind: 'category' | 'event' | 'day' | 'week' | 'range'
  value: string
  label: string
  color?: EventColor
}

interface MentionAutocompleteProps {
  searchText: string
  activeIndex: number
  onSelect: (suggestion: MentionSuggestion) => void
}

const DAY_LABELS_ZH = ['今天', '明天', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_LABELS_EN = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_VALUES = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const WEEK_LABELS: Record<string, { zh: string; en: string }> = {
  'this week': { zh: '本周', en: 'this week' },
  'last week': { zh: '上周', en: 'last week' },
  'thisweek': { zh: '本周', en: 'this week' },
  'lastweek': { zh: '上周', en: 'last week' },
}

export function MentionAutocomplete({ searchText, activeIndex, onSelect }: MentionAutocompleteProps) {
  const categories = useCategoryStore((s) => s.categories)
  const events = useEventStore((s) => s.events)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const lowerSearch = searchText.toLowerCase().trim()

  const suggestions = useMemo(() => {
    const result: MentionSuggestion[] = []
    let itemIndex = 0

    // 1. Categories
    const matchedCategories = categories.filter((cat) => {
      const name = cat.name[language].toLowerCase()
      return name.includes(lowerSearch) || cat.id.includes(lowerSearch)
    })
    for (const cat of matchedCategories) {
      result.push({
        kind: 'category',
        value: cat.id,
        label: `${t('分类', 'Cat')}: ${cat.name[language]}`,
        color: cat.color,
      })
      itemIndex++
    }

    // 2. Events from current week
    const now = new Date()
    const weekStart = getWeekStart(now, 1)
    const weekStartMs = weekStart.getTime()
    const weekEndMs = weekStartMs + 7 * 86400000
    const weekEvents = events.filter(
      (e) => e.startTime >= weekStartMs && e.startTime < weekEndMs,
    )
    const matchedEvents = weekEvents.filter((e) =>
      e.title?.toLowerCase().includes(lowerSearch),
    )
    for (const ev of matchedEvents) {
      result.push({
        kind: 'event',
        value: ev.id,
        label: `${t('事件', 'Event')}: ${ev.title || t('(无标题)', '(Untitled)')}`,
        color: ev.color as EventColor,
      })
      itemIndex++
    }

    // 3. Days
    for (let i = 0; i < DAY_VALUES.length; i++) {
      const label = language === 'zh' ? DAY_LABELS_ZH[i] : DAY_LABELS_EN[i]
      if (label.toLowerCase().includes(lowerSearch) || DAY_VALUES[i].includes(lowerSearch)) {
        result.push({
          kind: 'day',
          value: DAY_VALUES[i],
          label: t(DAY_LABELS_ZH[i], DAY_LABELS_EN[i]),
        })
        itemIndex++
      }
    }

    // 4. Week labels
    for (const [key, labels] of Object.entries(WEEK_LABELS)) {
      const matchLabel = language === 'zh' ? labels.zh : labels.en
      if (
        matchLabel.toLowerCase().includes(lowerSearch) ||
        key.includes(lowerSearch)
      ) {
        result.push({
          kind: 'week',
          value: key,
          label: t(labels.zh, labels.en),
        })
        itemIndex++
      }
    }

    return result
  }, [categories, events, language, lowerSearch])

  if (suggestions.length === 0) return null

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 mx-3 z-50 max-h-[200px] overflow-y-auto rounded-lg border border-border-default bg-surface-raised shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestions.map((suggestion, i) => {
        const isActive = i === activeIndex
        const name = suggestion.label.split(': ').slice(1).join(': ') || suggestion.label
        return (
          <button
            key={`${suggestion.kind}-${suggestion.value}-${i}`}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-sans transition-colors duration-100 cursor-pointer border-none ${
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:bg-surface-sunken'
            }`}
            onMouseDown={() => onSelect(suggestion)}
          >
            {suggestion.color && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: `var(--event-${suggestion.color}-fill)` }}
              />
            )}
            {!suggestion.color && (
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-border-subtle" />
            )}
            <span className="text-text-tertiary text-xs mr-1 uppercase font-semibold">
              {t(
                { category: '分类', event: '事件', day: '日期', week: '周', range: '范围' }[suggestion.kind],
                suggestion.kind,
              )}
            </span>
            <span className="text-text-primary truncate">{name || suggestion.label}</span>
          </button>
        )
      })}
    </div>
  )
}
