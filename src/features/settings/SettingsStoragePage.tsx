import { useT } from '@/i18n/useT'
import { StorageFolderSelector } from './StorageFolderSelector'
import { SettingsHeader, SettingsSection } from './ui'

/**
 * 「存储」隐藏子页：旧深链与旧持久化值仍指向它。
 * 内容与「文件」页的存储组同源，侧栏高亮由 `resolveNavTab` 落到「文件」。
 */
export function SettingsStorage() {
  const t = useT()

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader
        title={t('settings.tab.storage')}
        description={t('settings.file.storageHint')}
      />
      <SettingsSection>
        <StorageFolderSelector />
      </SettingsSection>
    </div>
  )
}
