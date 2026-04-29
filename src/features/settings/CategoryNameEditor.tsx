import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CATEGORY_NAME_MAX_LENGTH } from '@/domain/category'
import type { CategoryId } from '@/domain/category'

interface CategoryNameEditorProps {
  id: CategoryId
  name: string
  onCommit: (id: CategoryId, value: string) => void
}

export function CategoryNameEditor({ id, name, onCommit }: CategoryNameEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = () => {
    setEditing(true)
    setValue(name)
  }

  const commit = () => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) {
      onCommit(id, trimmed)
    } else {
      setValue(name)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setValue(name); setEditing(false); inputRef.current?.blur() }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={editing ? value : name}
      maxLength={CATEGORY_NAME_MAX_LENGTH}
      onChange={(e) => setValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex-1 px-2 py-1 text-sm font-sans rounded-lg',
        'bg-transparent border border-transparent',
        'text-text-primary',
        'hover:border-border-subtle focus:border-border-default',
        'focus:outline-none transition-colors duration-150',
      )}
    />
  )
}
