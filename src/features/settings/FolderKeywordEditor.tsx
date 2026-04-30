import { useState } from 'react'
import { Plus, X, FolderOpen, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KeywordFolder } from '@/domain/category'
import { addKeywordIfValid } from '@/domain/category'

const MAX_KEYWORD_LENGTH = 30

interface FolderKeywordEditorProps {
  folders: KeywordFolder[]
  onChange: (folders: KeywordFolder[]) => void
}

export function FolderKeywordEditor({ folders, onChange }: FolderKeywordEditorProps) {
  const [dragKey, setDragKey] = useState<string | null>(null) // `${folderId}::${keyword}`

  // ── Folder CRUD ─────────────────────────────────────────

  const addFolder = () => {
    const name = '新建文件夹'
    const folder: KeywordFolder = {
      id: crypto.randomUUID(),
      name,
      keywords: [],
    }
    onChange([...folders, folder])
  }

  const removeFolder = (folderId: string) => {
    onChange(folders.filter((f) => f.id !== folderId))
  }

  const renameFolder = (folderId: string, name: string) => {
    onChange(folders.map((f) => (f.id === folderId ? { ...f, name } : f)))
  }

  // ── Keyword CRUD ────────────────────────────────────────

  const addKeyword = (folderId: string, keyword: string) => {
    onChange(folders.map((f) => {
      if (f.id !== folderId) return f
      const updated = addKeywordIfValid(f.keywords, keyword)
      return updated ? { ...f, keywords: updated } : f
    }))
  }

  const removeKeyword = (folderId: string, keyword: string) => {
    onChange(folders.map((f) =>
      f.id === folderId ? { ...f, keywords: f.keywords.filter((k) => k !== keyword) } : f,
    ))
  }

  // ── Drag and drop ───────────────────────────────────────

  const onDragStart = (folderId: string, keyword: string) => {
    setDragKey(`${folderId}::${keyword}`)
  }

  const onDragEnd = () => {
    setDragKey(null)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const onDrop = (targetFolderId: string) => {
    if (!dragKey) return
    const [srcFolderId, keyword] = dragKey.split('::')
    if (!srcFolderId || !keyword) return
    if (srcFolderId === targetFolderId) return

    // Remove from source, add to target
    onChange(folders.map((f) => {
      if (f.id === srcFolderId) {
        return { ...f, keywords: f.keywords.filter((k) => k !== keyword) }
      }
      if (f.id === targetFolderId) {
        const updated = addKeywordIfValid(f.keywords, keyword)
        return updated ? { ...f, keywords: updated } : f
      }
      return f
    }))
    setDragKey(null)
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {folders.map((folder) => (
        <FolderSection
          key={folder.id}
          folder={folder}
          isOnly={folders.length === 1}
          dragKey={dragKey}
          onRename={(name) => renameFolder(folder.id, name)}
          onRemove={() => removeFolder(folder.id)}
          onAddKeyword={(kw) => addKeyword(folder.id, kw)}
          onRemoveKeyword={(kw) => removeKeyword(folder.id, kw)}
          onDragStart={(kw) => onDragStart(folder.id, kw)}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={() => onDrop(folder.id)}
        />
      ))}

      <button
        type="button"
        onClick={addFolder}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-sans text-text-tertiary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors duration-150 self-start cursor-pointer"
      >
        <Plus size={11} strokeWidth={2} />
        新建文件夹
      </button>
    </div>
  )
}

// ── Folder section sub-component ──────────────────────────

function FolderSection({
  folder, isOnly, dragKey, onRename, onRemove, onAddKeyword,
  onRemoveKeyword, onDragStart, onDragEnd, onDragOver, onDrop,
}: {
  folder: KeywordFolder
  isOnly: boolean
  dragKey: string | null
  onRename: (name: string) => void
  onRemove: () => void
  onAddKeyword: (kw: string) => void
  onRemoveKeyword: (kw: string) => void
  onDragStart: (kw: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(folder.name)
  const [adding, setAdding] = useState(false)
  const [kwValue, setKwValue] = useState('')

  const commitName = () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== folder.name) onRename(trimmed)
    setEditing(false)
  }

  const commitKeyword = () => {
    setAdding(false)
    const trimmed = kwValue.trim()
    if (trimmed) onAddKeyword(trimmed)
    setKwValue('')
  }

  const isDropTarget = dragKey && !dragKey.startsWith(`${folder.id}::`)

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 flex flex-col gap-1.5 transition-colors duration-150',
        isDropTarget
          ? 'border-accent bg-event-accent-bg/10'
          : 'border-border-subtle bg-surface-base',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Folder header */}
      <div className="flex items-center gap-1.5">
        <FolderOpen size={12} className="text-text-tertiary flex-shrink-0" />
        {editing ? (
          <input
            type="text"
            value={nameValue}
            maxLength={20}
            autoFocus
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitName() }
              if (e.key === 'Escape') { setEditing(false); setNameValue(folder.name) }
            }}
            className="flex-1 px-1 py-0 text-xs font-sans bg-transparent border-b border-border-default text-text-primary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-xs font-sans text-text-primary truncate cursor-pointer hover:text-text-secondary"
          >
            {folder.name}
          </button>
        )}
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="w-4 h-4 inline-flex items-center justify-center rounded-sm text-text-tertiary hover:text-rose-500 transition-colors duration-150 cursor-pointer"
          >
            <X size={11} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Keyword pills */}
      <div className="flex flex-wrap items-start gap-1 pl-[18px]">
        {folder.keywords.map((kw) => {
          const isDragging = dragKey === `${folder.id}::${kw}`
          return (
            <span
              key={kw}
              draggable
              onDragStart={() => onDragStart(kw)}
              onDragEnd={onDragEnd}
              className={cn(
                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-sans',
                'bg-surface-raised text-text-primary border border-border-subtle',
                'cursor-grab active:cursor-grabbing transition-opacity duration-150',
                isDragging && 'opacity-30',
              )}
            >
              <GripVertical size={10} className="text-text-tertiary" />
              {kw}
              <button
                type="button"
                onClick={() => onRemoveKeyword(kw)}
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
              >
                <X size={10} strokeWidth={2} />
              </button>
            </span>
          )
        })}

        {adding ? (
          <input
            type="text"
            autoFocus
            value={kwValue}
            maxLength={MAX_KEYWORD_LENGTH}
            onChange={(e) => setKwValue(e.target.value)}
            onBlur={commitKeyword}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitKeyword() }
              if (e.key === 'Escape') { setAdding(false); setKwValue('') }
            }}
            placeholder="..."
            className="w-24 px-2 py-0.5 text-xs font-sans rounded-md bg-transparent border border-border-default text-text-primary placeholder:text-text-tertiary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-sans text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors duration-150 cursor-pointer"
          >
            <Plus size={11} strokeWidth={2} />
            添加
          </button>
        )}
      </div>
    </div>
  )
}
