import { useState, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_KEYWORD_LENGTH = 30

interface KeywordEditorProps {
  keywords: string[]
  onChange: (keywords: string[]) => void
  disabled?: boolean
}

export function KeywordEditor({ keywords, onChange, disabled = false }: KeywordEditorProps) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startAdd = () => {
    if (disabled) return
    setAdding(true)
    setValue('')
    // Focus after render
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const commit = () => {
    setAdding(false)
    const trimmed = value.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed])
    }
    setValue('')
  }

  const remove = (kw: string) => {
    onChange(keywords.filter((k) => k !== kw))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setAdding(false); setValue('') }
  }

  return (
    <div className="flex flex-wrap items-start content-start gap-1.5 max-h-20 overflow-y-auto">
      {keywords.map((kw) => (
        <span
          key={kw}
          className={cn(
            'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-sans',
            'bg-surface-raised text-text-primary border border-border-subtle',
          )}
        >
          {kw}
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(kw)}
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
            >
              <X size={10} strokeWidth={2} />
            </button>
          )}
        </span>
      ))}

      {adding ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={MAX_KEYWORD_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder="..."
          className={cn(
            'w-24 px-2 py-0.5 text-xs font-sans rounded-md',
            'bg-transparent border border-border-default',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:outline-none',
          )}
        />
      ) : (
        <button
          type="button"
          onClick={startAdd}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-sans',
            'text-text-tertiary hover:text-text-primary hover:bg-surface-raised',
            'transition-colors duration-150 cursor-pointer',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          <Plus size={11} strokeWidth={2} />
          Add
        </button>
      )}
    </div>
  )
}
