import type { AiUserProfile, AiSkill, ChatMention, CalendarContextItem } from './aiChat'

export type AiModel = 'deepseek-chat' | 'deepseek-reasoner'

export interface AiAnalysisRequest {
  weekLabel: string
  totalHours: number
  byCategory: Array<{ name: string; hours: number; percentage: number }>
}

export interface AiAnalysisResult {
  observation: string
  pattern: string
  suggestion: string
}

export const ANALYSIS_SYSTEM_PROMPT = [
  '你是 CaILens 内置的时间观察者。你不是效率教练，不催促用户，不评价生活方式。',
  '',
  '原则：',
  '- 永远基于提供的真实数据说话，不编造事件',
  '- 反馈风格：简洁、具体、不堆砌正能量、不用感叹号',
  '- 当数据不足时直接说不足，不硬凑结论',
  '- 永远不评判用户的生活方式选择，只反映模式',
  '- 输出语言使用中文',
  '',
  '输出格式：严格按 JSON 返回，包含三个字段：',
  '- observation: 数据陈述，克制客观，一段话',
  '- pattern: 观察到一个模式，不做价值判断，一句话',
  '- suggestion: 一条温和的微调建议，不超过两句话。只给一条，不多给。',
  '- 当引用具体事件时，使用 [事件标题](event:事件ID) 格式。事件 ID 会在上下文中提供。',
].join('\n')

/** @deprecated Use ANALYSIS_SYSTEM_PROMPT instead */

/** @deprecated Use ANALYSIS_SYSTEM_PROMPT instead */
export const BASE_SYSTEM_PROMPT = ANALYSIS_SYSTEM_PROMPT

export const CHAT_SYSTEM_PROMPT = [
  '你是 CaILens 内置的时间观察者。你不是效率教练，不催促用户，不评价生活方式。',
  '',
  '原则：',
  '- 永远基于提供的真实数据说话，引用具体数字',
  '- 反馈风格：简洁、克制、不堆砌正能量、不用感叹号',
  '- 当数据不足时直接说不足，不硬凑结论',
  '- 永远不评判用户的生活方式选择，只反映模式',
  '- 当用户问"你是谁""你能做什么"时，简短介绍自己即可',
  '- 输出语言跟随用户输入的语言（中文或英文）',
  '',
  '输出格式：自然语言，用 markdown 组织。可以分段，但不要用标题堆砌。',
  '- 用户闲聊时简短回应，不把话题硬拽回时间数据',
  '- 用户问数据时，先给关键数字，再给一句话解读',
  '- 用户问建议时，只给一条，不多给',
  '- 当引用具体事件时，使用 [事件标题](event:事件ID) 格式创建可点击链接。事件 ID 会由系统在上下文中提供。',
].join('\n')

export function buildProfilePrompt(profile: AiUserProfile): string {
  const parts: string[] = []
  if (profile.mainConflict) {
    parts.push(`用户当前的主要矛盾：${profile.mainConflict}`)
  }
  if (profile.secondaryConflict) {
    parts.push(`用户当前的次要矛盾：${profile.secondaryConflict}`)
  }
  if (profile.desiredHabits) {
    parts.push(`用户希望保持的状态：${profile.desiredHabits}`)
  }
  if (profile.badHabits) {
    parts.push(`用户已知的坏习惯：${profile.badHabits}`)
  }
  if (profile.topicsToAvoid) {
    parts.push(`用户不希望 AI 提及的话题：${profile.topicsToAvoid}`)
  }
  if (parts.length === 0) return ''
  return ['', '## 用户画像', ...parts].join('\n')
}

export function buildSkillsPrompt(skills: AiSkill[]): string {
  const active = skills.filter((s) => s.enabled)
  if (active.length === 0) return ''
  const lines = active.map((s) => `- ${s.name}: ${s.promptTemplate}`)
  return ['', '## 激活的分析视角', ...lines].join('\n')
}

export function buildContextPrompt(
  mentions: ChatMention[],
  calendarContext: CalendarContextItem[],
  eventsMap?: Record<string, string>,
): string {
  const parts: string[] = []

  if (mentions.length > 0) {
    parts.push('## 用户提及的上下文')
    for (const m of mentions) {
      switch (m.kind) {
        case 'category':
          parts.push(`- 询问关于分类: ${m.label}`)
          break
        case 'event':
          parts.push(`- 引用了事件: ${m.label}`)
          break
        case 'day':
          parts.push(`- 关注日期: ${m.label}`)
          break
        case 'week':
          parts.push(`- 关注周: ${m.label}`)
          break
        case 'range':
          parts.push(`- 关注时间段: ${m.label}`)
          break
      }
    }
    parts.push('')
  }

  if (calendarContext.length > 0) {
    parts.push('## 日历选中上下文')
    for (const ctx of calendarContext) {
      if (ctx.type === 'event' && ctx.eventTitle) {
        parts.push(`- 选中事件: "${ctx.eventTitle}"`)
      } else if (ctx.type === 'range' && ctx.startTime && ctx.endTime) {
        parts.push(`- 选中时间段从 ${new Date(ctx.startTime).toLocaleString()} 到 ${new Date(ctx.endTime).toLocaleString()}`)
      }
    }
    parts.push('')
  }

  if (eventsMap && Object.keys(eventsMap).length > 0) {
    parts.push('## 事件引用 / Event References')
    parts.push('When referring to these events, use the provided IDs:')
    for (const [title, id] of Object.entries(eventsMap)) {
      parts.push(`- "${title}" → event:${id}`)
    }
    parts.push('')
  }

  return parts.join('\n')
}

export function buildSystemPrompt(
  profile?: AiUserProfile,
  skills?: AiSkill[],
  customPrompt?: string,
  basePrompt?: string,
): string {
  const parts = [basePrompt ?? ANALYSIS_SYSTEM_PROMPT]
  if (profile) {
    const profileText = buildProfilePrompt(profile)
    if (profileText) parts.push(profileText)
  }
  if (skills && skills.length > 0) {
    const skillsText = buildSkillsPrompt(skills)
    if (skillsText) parts.push(skillsText)
  }
  if (customPrompt) {
    parts.push('', '## 用户自定义指令', customPrompt)
  }
  return parts.join('\n')
}

export function buildWeeklyPrompt(req: AiAnalysisRequest, priorContext?: string): {
  systemPrompt: string
  userPrompt: string
} {
  const catLines = req.byCategory
    .filter((c) => c.hours > 0)
    .map((c) => `- ${c.name}: ${c.hours.toFixed(0)}h (${c.percentage.toFixed(0)}%)`)

  const userPrompt = [
    `以下是 ${req.weekLabel} 的时间记录摘要：`,
    `总时长: ${req.totalHours.toFixed(0)}h`,
    catLines.length > 0 ? `分类明细:\n${catLines.join('\n')}` : '本周暂无分类记录',
    priorContext ? `\n用户背景:\n${priorContext}` : '',
    '\n请开始分析。',
  ].join('\n')

  return { systemPrompt: ANALYSIS_SYSTEM_PROMPT, userPrompt }
}
