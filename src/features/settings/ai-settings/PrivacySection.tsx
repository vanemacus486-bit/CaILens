import { useState } from 'react'
import { Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'

export function PrivacySection() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const setAiMaxTokens = useAppSettingsStore((s) => s.setAiMaxTokens)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [confirmClear, setConfirmClear] = useState(false)

  const maxTokens = settings.aiMaxTokens ?? 2000

  function handleClearConversations() {
    // Clear conversations from localStorage
    localStorage.removeItem('cailens-ai-conversations')
    setConfirmClear(false)
  }

  function handleExportConversations() {
    const raw = localStorage.getItem('cailens-ai-conversations')
    const data = raw ? JSON.parse(raw) : []
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cailens-ai-conversations-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <fieldset className="flex flex-col gap-4 border-none p-0">
      <label className="text-xs text-text-tertiary font-sans">
        {t('隐私与数据', 'Privacy & Data')}
      </label>

      {/* Clear conversations */}
      <div>
        {confirmClear ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-color-text-danger/30 bg-color-text-danger/5">
            <span className="text-sm font-sans text-text-primary">
              {t('确定清空所有对话历史？此操作不可撤销。', 'Clear all conversation history? This cannot be undone.')}
            </span>
            <button
              type="button"
              onClick={handleClearConversations}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                'bg-color-text-danger text-white hover:opacity-90',
              )}
            >
              {t('确认清空', 'Confirm Clear')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                'bg-surface-sunken text-text-secondary hover:text-text-primary',
              )}
            >
              {t('取消', 'Cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
              'text-text-secondary hover:text-color-text-danger bg-surface-sunken hover:bg-color-text-danger/10',
            )}
          >
            <Trash2 size={14} />
            {t('清空所有对话历史', 'Clear All Conversations')}
          </button>
        )}
      </div>

      {/* Export conversations */}
      <div>
        <button
          type="button"
          onClick={handleExportConversations}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
            'text-text-secondary hover:text-text-primary bg-surface-sunken hover:bg-surface-raised',
          )}
        >
          <Download size={14} />
          {t('导出对话历史', 'Export Conversations')}
        </button>
      </div>

      {/* Token limit */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-tertiary font-sans">
          {t('每次请求 Token 限制', 'Token Limit Per Request')}
        </label>
        <input
          type="number"
          min={1}
          max={128000}
          value={maxTokens}
          onChange={(e) => fireAndForget(setAiMaxTokens(Number(e.target.value)), 'set ai max tokens')}
          className={cn(
            'w-full max-w-[200px] h-9 px-3 rounded-lg text-sm font-mono',
            'bg-surface-sunken border border-border-subtle',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'transition-colors duration-200',
          )}
        />
      </div>
    </fieldset>
  )
}
