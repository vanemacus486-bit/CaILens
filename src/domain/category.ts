import type { EventColor } from './event'

export type CategoryId = EventColor // 临时设计：id 与 color 一一对应

export interface Category {
  id: CategoryId    // 与 EventColor 一致，如 'accent'
  name: string      // 用户可编辑，最长 20 字符
  color: EventColor // 固定，与 id 同值
}

// 6 个系统预置分类的默认名（中文）
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'accent', name: '深度工作', color: 'accent' },
  { id: 'sage',   name: '会议沟通', color: 'sage'   },
  { id: 'sand',   name: '学习阅读', color: 'sand'   },
  { id: 'sky',    name: '日常事务', color: 'sky'    },
  { id: 'rose',   name: '休息放松', color: 'rose'   },
  { id: 'stone',  name: '其他',     color: 'stone'  },
] as const

export const CATEGORY_NAME_MAX_LENGTH = 20

// 注：id 与 color 暂时一致是简化设计。
// 未来若支持自定义颜色需要解耦。
