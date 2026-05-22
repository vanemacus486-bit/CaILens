/**
 * # 灵感日志（Inspiration Log）
 *
 * 每个时间块结束后，可附加一条"反思一句话"（可跳过）。
 * 灵感按时间倒序累积在项目下，与具体事件块关联。
 */

export interface InspirationLog {
  id: string
  projectId: string
  eventId: string
  content: string
  createdAt: number
}

export type CreateInspirationInput = Pick<
  InspirationLog,
  'projectId' | 'eventId' | 'content'
>
