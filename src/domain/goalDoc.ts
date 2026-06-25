/**
 * # GoalDoc — 目标文档领域类型
 *
 * 自由记录区：一篇目标下可攒任意多篇文档（标题 + 正文），记什么都行
 * —— 资料链接、错题本、想法、复盘…不再强塞进固定框架。
 * denormalized 存于 Goal.doc，无需 Dexie 迁移（同 metrics）。
 * 纯类型 + 纯函数，不依赖 React/Dexie/浏览器 API。
 */

// ── 主类型 ──────────────────────────────────────────────────

/** 一篇自由文档：标题 + 正文 */
export interface GoalNote {
  id: string
  /** 标题（可空，显示为「无标题文档」） */
  title: string
  /** 正文，保留原始换行与缩进，不裁剪 */
  body: string
  createdAt: number
  updatedAt: number
}

export interface GoalDoc {
  /** 文档列表，按追加顺序存储与展示（先记的在上） */
  notes: GoalNote[]
}

/**
 * 持久化里可能遇到的形态：
 * - 新版 `{ notes }`
 * - 旧版三段框架 `{ why, results, attempts }`（迁移用，见 normalizeGoalDoc）
 */
interface LegacyAttempt {
  id: string
  what: string
  effect: string
  createdAt: number
}
interface StoredGoalDoc {
  notes?: GoalNote[]
  why?: string
  results?: string
  attempts?: LegacyAttempt[]
}

// ── 纯函数 ──────────────────────────────────────────────────

export function emptyGoalDoc(): GoalDoc {
  return { notes: [] }
}

export function makeNote(id: string, now: number, title = '', body = ''): GoalNote {
  return { id, title: title.trim(), body, createdAt: now, updatedAt: now }
}

/**
 * 把持久化里的文档归一成新版 `{ notes }`。
 * 旧版三段框架（why / results / attempts）会被折叠成对应的几篇文档，零丢失；
 * 已是新版结构则原样返回。读路径每次都过它，写路径写回的就是新版结构。
 */
export function normalizeGoalDoc(raw: StoredGoalDoc | undefined | null, now = Date.now()): GoalDoc {
  if (!raw) return emptyGoalDoc()
  // 新版：已经是文档列表
  if (Array.isArray(raw.notes)) return { notes: raw.notes }

  // 旧版三段框架 → 折叠成文档
  const notes: GoalNote[] = []
  const t = raw.attempts?.length ? Math.min(...raw.attempts.map((a) => a.createdAt)) : now
  const why = raw.why?.trim()
  const results = raw.results?.trim()
  if (why) notes.push(makeNote('legacy-why', t, '为什么做这个目标', why))
  if (results) notes.push(makeNote('legacy-results', t, '取得了什么结果', results))
  if (raw.attempts && raw.attempts.length > 0) {
    const body = raw.attempts
      .map((a) => {
        const what = a.what.trim()
        const effect = a.effect.trim()
        return effect ? `• ${what}\n  ${effect}` : `• ${what}`
      })
      .join('\n\n')
    notes.push(makeNote('legacy-attempts', t, '试过什么 · 效果如何', body))
  }
  return { notes }
}

/** 没有任何带内容的文档（标题、正文都空白）视为空文档 */
export function isGoalDocEmpty(doc: StoredGoalDoc | undefined | null): boolean {
  return normalizeGoalDoc(doc).notes.every((n) => n.title.trim() === '' && n.body.trim() === '')
}
