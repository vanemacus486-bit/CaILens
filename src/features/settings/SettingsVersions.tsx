import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, ExternalLink, Loader2, Pin, PinOff, RefreshCw } from 'lucide-react'
import { isTauri } from '@/data/tauriFs'
import { openExternal } from '@/lib/platform'
import { fireAndForget } from '@/lib/fireAndForget'
import {
  checkForUpdateVerbose,
  installUpdate,
  relaunchApp,
  type UpdateCheckResult,
} from '@/lib/appUpdate'
import {
  ARCHIVED_BEFORE,
  ARCHIVED_COUNT,
  REPO,
  VERSION_HISTORY,
  findVersionIndex,
  releaseAgeLabel,
  versionReleaseUrl,
  type VersionNote,
  type VersionSectionKind,
} from '@/domain/version'
import { useT } from '@/i18n/useT'
import { useAppSettingsStore as useSettings } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import {
  SettingsButton,
  SettingsHeader,
  SettingsNotice,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
} from './ui'

const SECTION_KEY: Record<VersionSectionKind, string> = {
  new: 'settings.versions.section.new',
  fix: 'settings.versions.section.fix',
  improve: 'settings.versions.section.improve',
  remove: 'settings.versions.section.remove',
}

/**
 * 「版本」页。
 *
 * 结构照 Obsidian 的版本面板：一行一个版本，右侧是相对时间，展开看更新内容，
 * 底部一条「显示更早的 N 个版本」。当前版本带「正在运行」标记，最新一条默认展开。
 *
 * 回退不是真的重装旧包（那需要联网且会中断会话），而是**固定**在所选版本：
 * 写入 `pinnedVersion` 后不再提示新版本，用户随时可解除。面板文案如实这么写，
 * 不承诺做不到的事。
 */
export function SettingsVersions() {
  const t = useT()
  const pinnedVersion = useSettings((s) => s.settings.pinnedVersion)
  const setPinnedVersion = useSettings((s) => s.setPinnedVersion)
  const autoUpdateCheck = useSettings((s) => s.settings.autoUpdateCheck)
  const setAutoUpdateCheck = useSettings((s) => s.setAutoUpdateCheck)

  const now = useMemo(() => Date.now(), [])
  const currentVersion = __APP_VERSION__
  const currentIndex = findVersionIndex(VERSION_HISTORY, currentVersion)

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(currentIndex >= 0 ? [VERSION_HISTORY[currentIndex].version] : [VERSION_HISTORY[0]?.version ?? '']),
  )
  const [showEarlier, setShowEarlier] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  const toggle = (version: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }

  const runUpdateCheck = async () => {
    setChecking(true)
    setResult(null)
    setInstallError(null)
    try {
      setResult(await checkForUpdateVerbose())
    } finally {
      setChecking(false)
    }
  }

  const handleInstallUpdate = async (update: Extract<UpdateCheckResult, { status: 'available' }>) => {
    setDownloading(true)
    setProgress(0)
    setInstallError(null)
    try {
      await installUpdate(update.info, setProgress)
      setDownloading(false)
      setInstalling(true)
      await relaunchApp()
    } catch (error) {
      setDownloading(false)
      setInstalling(false)
      setInstallError(error instanceof Error ? error.message : String(error))
    }
  }

  const renderNote = (note: VersionNote) => {
    const isOpen = expanded.has(note.version)
    const isCurrent = note.version === currentVersion
    const isPinned = pinnedVersion === note.version
    return (
      <div key={note.version} data-settings-item={`version-${note.version}`} className="scroll-mt-4 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-base font-medium text-text-primary">v{note.version}</span>
              {isCurrent && (
                <span className="rounded-md bg-accent/12 px-1.5 py-0.5 font-sans text-[11px] font-medium text-accent">
                  {t('settings.versions.running')}
                </span>
              )}
              {isCurrent && (
                <span className="font-sans text-[11px] text-text-tertiary">
                  {t('settings.versions.local')} · {t('settings.versions.takesEffect')}
                </span>
              )}
              {isPinned && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-sunken px-1.5 py-0.5 font-sans text-[11px] text-text-secondary">
                  <Pin size={10} strokeWidth={2} />
                  {t('settings.versions.pinned')}
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 font-sans text-xs text-text-tertiary">
            {releaseAgeLabel(note.releasedAt, now)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggle(note.version)}
            className="inline-flex cursor-pointer items-center gap-1 font-sans text-xs text-text-tertiary transition-colors duration-200 hover:text-text-primary"
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
            {isOpen ? t('settings.versions.collapse') : t('settings.versions.updateNotes')}
          </button>
          <span className="text-text-tertiary/40">·</span>
          <button
            type="button"
            onClick={() => fireAndForget(openExternal(versionReleaseUrl(note.version)), 'open release')}
            className="inline-flex cursor-pointer items-center gap-1 font-sans text-xs text-text-tertiary transition-colors duration-200 hover:text-text-primary"
          >
            <ExternalLink size={11} strokeWidth={2} />
            {t('settings.versions.openRelease')}
          </button>
        </div>

        {isOpen && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg bg-surface-sunken/60 px-4 py-3">
            <p className="font-sans text-xs leading-relaxed text-text-secondary">{note.summary}</p>
            {note.sections.map((section) => (
              <div key={section.kind} className="flex flex-col gap-1">
                <h4 className="font-sans text-xs font-medium text-text-secondary">
                  {t(SECTION_KEY[section.kind] as never)}
                </h4>
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  {section.items.map((item) => (
                    <li key={item} className="font-sans text-xs leading-relaxed text-text-tertiary">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!isCurrent && (
              <div>
                <SettingsButton
                  variant={isPinned ? 'secondary' : 'primary'}
                  onClick={() =>
                    fireAndForget(
                      setPinnedVersion(isPinned ? null : note.version),
                      'pin version',
                    )
                  }
                >
                  {isPinned ? <PinOff size={13} strokeWidth={1.75} /> : <Pin size={13} strokeWidth={1.75} />}
                  {isPinned ? t('settings.versions.unpin') : t('settings.versions.rollback')}
                </SettingsButton>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader title={t('settings.versions')} description={t('settings.versionsDesc')} />

      {pinnedVersion && (
        <SettingsNotice tone="info">
          <span className="flex flex-wrap items-center gap-2">
            {t('settings.versions.pinnedHint', pinnedVersion)}
            <button
              type="button"
              onClick={() => fireAndForget(setPinnedVersion(null), 'unpin version')}
              className="cursor-pointer font-medium underline underline-offset-2"
            >
              {t('settings.versions.unpin')}
            </button>
          </span>
        </SettingsNotice>
      )}

      <SettingsSection
        anchor="versions-history"
        title={`v${currentVersion}`}
        description={t('settings.currentVersion')}
        divided
      >
        {VERSION_HISTORY.map(renderNote)}
      </SettingsSection>

      <div className="flex flex-col gap-2 px-0.5">
        <button
          type="button"
          onClick={() => setShowEarlier((v) => !v)}
          className="inline-flex w-fit cursor-pointer items-center gap-1 font-sans text-xs text-text-tertiary transition-colors duration-200 hover:text-text-primary"
        >
          {showEarlier ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
          {showEarlier
            ? t('settings.versions.hideEarlier')
            : t('settings.versions.showEarlier', ARCHIVED_COUNT)}
        </button>
        {showEarlier && (
          <p className="font-sans text-xs leading-relaxed text-text-tertiary">
            {t('settings.versions.older')}（≤ v{ARCHIVED_BEFORE}）：{' '}
            <button
              type="button"
              onClick={() =>
                fireAndForget(
                  openExternal(`https://github.com/${REPO}/blob/main/CHANGELOG.md`),
                  'open changelog',
                )
              }
              className="cursor-pointer text-accent underline underline-offset-2"
            >
              CHANGELOG.md
            </button>
          </p>
        )}
      </div>

      <SettingsSection title={t('settings.section.updates')}>
        <SettingsRow
          anchor="versions-check"
          title={t('settings.currentVersion')}
          description={t('settings.autoUpdateHint')}
          footer={
            <div className="flex flex-col gap-2">
              {!isTauri() && (
                <p className="font-sans text-xs text-text-tertiary">{t('settings.update.desktopOnly')}</p>
              )}
              {result?.status === 'latest' && (
                <p role="status" className="font-sans text-xs text-text-tertiary">
                  {t('settings.update.upToDate')}
                </p>
              )}
              {result?.status === 'error' && <SettingsNotice tone="danger">{result.message}</SettingsNotice>}
              {installError && <SettingsNotice tone="danger">{installError}</SettingsNotice>}
              {result?.status === 'available' && (
                <div className="rounded-lg border border-accent/25 bg-surface-base px-4 py-3">
                  <p className="font-sans text-sm font-medium text-text-primary">
                    {t('settings.update.newVersion')}: <span className="font-mono">v{result.info.version}</span>
                  </p>
                  <p className="mt-1 font-sans text-xs text-text-tertiary">
                    {t('settings.currentVersion')}: <span className="font-mono">v{result.info.currentVersion}</span>
                  </p>
                  {downloading ? (
                    <div className="mt-3 flex items-center gap-2 font-sans text-xs text-text-secondary">
                      <Download size={13} strokeWidth={1.75} className="animate-pulse" />
                      {t('settings.update.downloading')} {progress}%
                    </div>
                  ) : installing ? (
                    <div className="mt-3 flex items-center gap-2 font-sans text-xs text-text-secondary">
                      <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                      {t('settings.update.installing')}
                    </div>
                  ) : (
                    <SettingsButton variant="primary" className="mt-3" onClick={() => void handleInstallUpdate(result)}>
                      <Download size={13} strokeWidth={1.75} />
                      {t('settings.update.updateNow')}
                    </SettingsButton>
                  )}
                </div>
              )}
            </div>
          }
        >
          <SettingsButton onClick={runUpdateCheck} disabled={checking || downloading || installing}>
            <RefreshCw size={13} strokeWidth={1.75} className={cn(checking && 'animate-spin')} />
            {checking ? t('settings.update.checking') : t('settings.update.checkForUpdates')}
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          anchor="versions-auto-update"
          title={t('settings.autoUpdate')}
          description={t('settings.autoUpdateHint')}
        >
          <SettingsToggle
            checked={autoUpdateCheck !== false}
            onChange={(v) => fireAndForget(setAutoUpdateCheck(v), 'set auto update')}
            label={t('settings.autoUpdate')}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
