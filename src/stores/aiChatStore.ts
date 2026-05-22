import { create } from 'zustand'

export interface AiChatState {
  startConversation: () => void
  addCalendarContext: (contexts: any[]) => void
}

export const useAiChatStore = create<AiChatState>(() => ({
  startConversation: () => {},
  addCalendarContext: () => {},
}))
