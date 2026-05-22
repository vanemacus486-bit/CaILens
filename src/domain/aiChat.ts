export interface AiConversation { id: string; weekStart: number; updatedAt: number; messages: any[] }
export interface AiChatMessage { id: string; conversationId: string; createdAt: number; role: string; content: string }
export interface PinnedAnalysis { id: string; date: number; conversationId: string }
export interface MessageFeedback { id: string; messageId: string }
export interface AnchorMatch {
  anchor: string
  matchType: string
  type?: 'category' | 'event'
  categoryId?: string
  eventTitle?: string
}
