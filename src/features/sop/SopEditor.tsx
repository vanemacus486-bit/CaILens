/**
 * # SOP 编辑器
 *
 * 在项目详情页内联的 SOP 编辑面板。
 * 支持编辑步骤、提交新版本、查看历史、回退。
 */

import { useState, useCallback, useEffect } from 'react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useSopStore } from '@/stores/sopStore'
import type { SopSection } from '@/domain/sop'

interface Props {
  projectId: string
}

export function SopEditor({ projectId }: Props) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useCallback(
    (zh: string, en: string) => (language === 'zh' ? zh : en),
    [language],
  )

  const { getByProject, createSop, updateSop, loadVersions, versions } =
    useSopStore()

  const sop = getByProject(projectId)

  const [sections, setSections] = useState<SopSection[]>(sop?.sections ?? [])
  const [changelog, setChangelog] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load versions when SOP exists and history is opened
  useEffect(() => {
    if (sop && showHistory) loadVersions(sop.id)
  }, [sop, showHistory, loadVersions])

  // Sync sections when SOP loads
  useEffect(() => {
    if (sop) setSections(sop.sections)
  }, [sop])

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        type: 'step',
        title: '',
        content: '',
        order: prev.length,
      },
    ])
  }

  const updateSection = (
    id: string,
    field: 'title' | 'content' | 'type',
    value: string,
  ) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    )
  }

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (sop) {
        await updateSop(
          sop.id,
          sections.filter((s) => s.title || s.content),
          changelog || t('编辑内容', 'Edited content'),
        )
      } else {
        await createSop(
          projectId,
          projectId, // use project name as SOP name
        )
      }
      setChangelog('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-medium text-text-primary">
          {t('标准操作流程', 'SOP')}
        </h3>
        <div className="flex items-center gap-2">
          {sop && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="h-7 px-2.5 rounded-md text-xs font-sans text-text-secondary border border-border-subtle hover:bg-surface-sunken cursor-pointer bg-transparent transition-colors"
            >
              {showHistory
                ? t('隐藏历史', 'Hide history')
                : t('版本历史', 'History')}
            </button>
          )}
          <button
            type="button"
            onClick={addSection}
            className="h-7 px-2.5 rounded-md text-xs font-sans text-accent border border-accent/30 hover:bg-accent-light cursor-pointer bg-transparent transition-colors"
          >
            + {t('添加步骤', 'Add step')}
          </button>
        </div>
      </div>

      {/* 空状态 */}
      {!sop && sections.length === 0 && (
        <p className="font-sans text-xs text-text-tertiary italic py-4">
          {t(
            '暂无 SOP，添加第一步开始记录标准操作流程。',
            'No SOP yet. Add your first step.',
          )}
        </p>
      )}

      {/* 步骤列表 */}
      <div className="space-y-3">
        {sections.map((sec, i) => (
          <div
            key={sec.id}
            className="bg-surface-raised border border-border-default rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-text-tertiary w-4">
                {i + 1}.
              </span>
              <input
                value={sec.title}
                onChange={(e) => updateSection(sec.id, 'title', e.target.value)}
                placeholder={t('步骤标题…', 'Step title…')}
                className="flex-1 text-sm font-sans text-text-primary bg-transparent border-none outline-none placeholder:text-text-tertiary"
              />
              <button
                type="button"
                onClick={() => removeSection(sec.id)}
                className="w-5 h-5 flex items-center justify-center rounded text-text-tertiary hover:text-color-text-danger cursor-pointer border-none bg-transparent"
                title={t('删除', 'Delete')}
              >
                ×
              </button>
            </div>
            <textarea
              value={sec.content}
              onChange={(e) => updateSection(sec.id, 'content', e.target.value)}
              rows={2}
              placeholder={t('步骤描述…', 'Step description…')}
              className="w-full text-xs font-sans text-text-secondary bg-transparent border-0 outline-none resize-none placeholder:text-text-tertiary ml-6"
            />
          </div>
        ))}
      </div>

      {/* 保存区 */}
      <div className="flex items-center gap-2 pt-2">
        <input
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          placeholder={t('修订说明（可选）…', 'Changelog (optional)…')}
          className="flex-1 h-8 px-2.5 rounded-md text-xs font-sans text-text-primary bg-surface-sunken border border-border-default focus:border-accent focus-visible:outline-none placeholder:text-text-tertiary"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-3 rounded-md text-xs font-sans font-medium text-white bg-accent hover:opacity-90 disabled:opacity-40 cursor-pointer border-none transition-opacity"
        >
          {saving
            ? t('保存中…', 'Saving…')
            : sop
              ? t('提交新版本', 'New version')
              : t('创建 SOP', 'Create SOP')}
        </button>
      </div>

      {/* 版本历史面板 */}
      {showHistory && sop && (
        <SopVersionHistory
          currentVersionId={sop.currentVersionId}
          versionList={versions[sop.id] ?? []}
          onRevert={async (ver) => {
            await updateSop(sop.id, [], `回退到 v${ver}`)
            loadVersions(sop.id)
          }}
          t={t}
        />
      )}
    </div>
  )
}

// ── 版本历史面板 ──────────────────────────────────────────

function SopVersionHistory({
  currentVersionId,
  versionList,
  onRevert,
  t,
}: {
  currentVersionId: string
  versionList: { id: string; version: number; changelog: string; source: string; createdAt: number }[]
  onRevert: (version: number) => Promise<void>
  t: (zh: string, en: string) => string
}) {
  const [reverting, setReverting] = useState<string | null>(null)

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      <h4 className="font-sans text-xs font-medium text-text-primary mb-3">
        {t('版本历史', 'Version History')}
      </h4>
      <div className="space-y-2">
        {versionList.map((v) => {
          const isCurrent = v.id === currentVersionId
          return (
            <div
              key={v.id}
              className="flex items-start gap-3 py-2 px-3 rounded-md bg-surface-raised border border-border-subtle"
            >
              <span className="font-mono text-xs font-medium text-text-secondary w-8 flex-shrink-0">
                v{v.version}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-xs text-text-primary truncate">
                  {v.changelog}
                </p>
                <p className="font-sans text-[10px] text-text-tertiary mt-0.5">
                  {new Date(v.createdAt).toLocaleDateString()} · {v.source}
                </p>
              </div>
              {isCurrent ? (
                <span className="font-sans text-[10px] text-accent flex-shrink-0">
                  {t('当前', 'Current')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setReverting(v.id)
                    await onRevert(v.version)
                    setReverting(null)
                  }}
                  disabled={reverting === v.id}
                  className="h-6 px-2 rounded text-[10px] font-sans text-text-secondary border border-border-subtle hover:bg-surface-sunken disabled:opacity-40 cursor-pointer bg-transparent transition-colors flex-shrink-0"
                >
                  {reverting === v.id ? '…' : t('回退', 'Revert')}
                </button>
              )}
            </div>
          )
        })}
        {versionList.length === 0 && (
          <p className="font-sans text-xs text-text-tertiary italic">
            {t('暂无版本记录', 'No version history yet.')}
          </p>
        )}
      </div>
    </div>
  )
}
