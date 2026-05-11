import { Sparkles, GitCompare, CalendarPlus, Search, Lightbulb, BarChart3, TrendingUp } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { computeWeekStats } from '@/domain/stats'
import type { AiChatMessage } from '@/domain/aiChat'

interface Action {
  icon: typeof Sparkles
  label: string
  message: string
  mode: 'analysis' | 'chat'
}

function isAnalysisResponse(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed.observation === 'string' && typeof parsed.pattern === 'string'
  } catch {
    return false
  }
}

function getTopCategoryLabel(weekStart: number | null, language: string): string {
  if (!weekStart) return ''

  const events = useEventStore.getState().events
  const categories = useCategoryStore.getState().categories
  const weekEnd = weekStart + 7 * 86400000
  const stats = computeWeekStats(events, categories, weekStart, weekEnd)

  const top = [...stats.byCategory]
    .filter((s) => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)[0]

  if (!top) return ''

  const cat = categories.find((c) => c.id === top.categoryId)
  return cat ? cat.name[language === 'zh' ? 'zh' : 'en'] : top.categoryId
}

function getContextualActions(
  messages: AiChatMessage[],
  weekStart: number | null,
  language: string,
  t: (zh: string, en: string) => string,
): Action[] {
  // Empty conversation — no messages yet
  if (messages.length === 0) {
    return [
      {
        icon: Sparkles,
        label: t('分析本周', 'Ask About My Week'),
        message: t(
          '请分析本周的时间记录，包括：1) 时间在各分类的分布，2) 任何值得注意的模式或异常，3) 一条温和的改进建议。',
          "Please analyze this week's time records. Include: 1) distribution across categories, 2) any notable patterns or anomalies, 3) one gentle suggestion for improvement.",
        ),
        mode: 'analysis' as const,
      },
      {
        icon: BarChart3,
        label: t('发现模式', 'What Patterns Do You See?'),
        message: t(
          '回顾本周的时间记录，识别出任何重复出现的模式——不管是好的还是不好的。在哪些时间段你通常最专注？哪些活动经常超出预期时间？',
          "Looking at this week's time records, identify any recurring patterns. During which time periods are you usually most focused? What activities regularly take longer than expected?",
        ),
        mode: 'analysis' as const,
      },
      {
        icon: CalendarPlus,
        label: t('规划下周', 'Help Me Plan Next Week'),
        message: t(
          '基于过去几周的时间数据，请为下周提供一个温和的规划建议。考虑：1) 哪些方面运作良好值得保持，2) 时间在哪里持续流失，3) 一个值得尝试的小改变。不要列出刚性时间表——建议而非命令。',
          "Based on the past few weeks of time data, suggest a gentle plan for next week. Consider: 1) what's been working well, 2) where time consistently leaks, 3) one small change worth trying. Suggest, don't prescribe a rigid schedule.",
        ),
        mode: 'analysis' as const,
      },
    ]
  }

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')

  // After an analysis response
  if (lastAssistantMsg && isAnalysisResponse(lastAssistantMsg.content)) {
    const topCategory = getTopCategoryLabel(weekStart, language)
    const digLabel = topCategory
      ? t(`深入分析「${topCategory}」`, `Dig Deeper into ${topCategory}`)
      : t('深入分析', 'Dig Deeper')

    return [
      {
        icon: Search,
        label: digLabel,
        message: t(
          `关于「${topCategory || '本周数据'}」我想了解更多细节。为什么在这个分类上花了这么多时间？这些时间具体用在了哪里？`,
          `I'd like to dig deeper into ${topCategory || "this week's data"}. Why was so much time spent in this category? What specific activities consumed the time?`,
        ),
        mode: 'analysis' as const,
      },
      {
        icon: Lightbulb,
        label: t('改进建议', 'What Should I Change?'),
        message: t(
          '基于本周的模式分析，给出一条具体、可操作的行为调整建议。告诉我具体可以在哪个时间点、针对哪个活动做什么微调。',
          "Based on this week's patterns, give me one specific, actionable behavioral adjustment. Tell me exactly what small change to make, when, and for which activity.",
        ),
        mode: 'chat' as const,
      },
      {
        icon: GitCompare,
        label: t('对比上周', 'Compare with Last Week'),
        message: t(
          '请将本周的时间数据与上周对比。重点关注：1) 哪些分类的时间发生了显著变化，2) 趋势是延续还是反转，3) 值得留意的上下文。',
          "Compare this week's time data with last week. Focus on: 1) which categories changed significantly, 2) whether trends are continuing or reversing, 3) any context worth noting.",
        ),
        mode: 'analysis' as const,
      },
    ]
  }

  // Default: general chat context
  return [
    {
      icon: Sparkles,
      label: t('分析本周', 'Analyze This Week'),
      message: t(
        '请分析本周的时间记录，包括：1) 时间在各分类的分布，2) 任何值得注意的模式或异常，3) 一条温和的改进建议。',
        "Please analyze this week's time records. Include: 1) distribution across categories, 2) any notable patterns or anomalies, 3) one gentle suggestion for improvement.",
      ),
      mode: 'analysis' as const,
    },
    {
      icon: Lightbulb,
      label: t('给我建议', 'Any Suggestions?'),
      message: t(
        '基于我的时间记录数据，你看到了哪些可以改进的地方？请给出一条温和的、具体的建议。',
        'Based on my time records, what improvements do you see? Give me one gentle, specific suggestion.',
      ),
      mode: 'chat' as const,
    },
    {
      icon: TrendingUp,
      label: t('查看趋势', 'Show Me Trends'),
      message: t(
        '请分析最近几周的时间趋势。哪些分类的时间在增加？哪些在减少？这些变化可能意味着什么？',
        'Analyze the time trends over the past few weeks. Which categories are increasing? Which are decreasing? What might these changes mean?',
      ),
      mode: 'analysis' as const,
    },
  ]
}

export function QuickActions() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const messages = useAiChatStore((s) => s.messages)
  const weekStart = useAiChatStore((s) => s.weekStart)
  const sendMessage = useAiChatStore((s) => s.sendMessage)
  const isStreaming = useAiChatStore((s) => s.isStreaming)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  if (isStreaming) return null

  const actions = getContextualActions(messages, weekStart, language, t)

  return (
    <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0 border-t border-border-subtle">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => sendMessage(action.message, action.mode)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans text-text-secondary bg-surface-sunken hover:bg-surface-raised hover:text-text-primary transition-colors duration-200 cursor-pointer border-none whitespace-nowrap flex-shrink-0"
        >
          <action.icon size={12} />
          {action.label}
        </button>
      ))}
    </div>
  )
}
