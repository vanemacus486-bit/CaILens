import { Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { SlideSegmented } from './SlideSegmented'
import { useDomainNav } from './domainNav'
import { WindowControls } from './WindowControls'
import { AccountMenu } from './AccountMenu'
import { PluginTopBar } from '@/plugins/PluginTopBar'
import { findDomainPlugin } from '@/plugins/registry'
import { useAppSettingsStore } from '@/stores/settingsStore'

export function TopNavBar() {
  const location = useLocation()
  const { activeMode, navItems, handleModeChange, shortcutHints } = useDomainNav()

  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)
  // 当前路径是否由某个域插件认领 —— 认领了才给它顶栏插槽
  const inPluginDomain = findDomainPlugin(location.pathname, overrides ?? {}) !== undefined

  return (
    <div
      className={`nav-bar flex h-[52px] flex-shrink-0 items-center px-6${inPluginDomain ? ' max-md:h-[100px] max-md:flex-col max-md:px-3 max-md:py-1' : ''}`}
      data-tauri-drag-region
    >
      {inPluginDomain && (
        <div className="stats-pills-scroll scrollbar-hide ml-0 flex-shrink-0 md:ml-5 max-md:order-2 max-md:w-full max-md:overflow-x-auto max-md:overscroll-x-contain">
          <PluginTopBar />
        </div>
      )}

      <div className={`flex-1${inPluginDomain ? ' max-md:hidden' : ''}`} data-tauri-drag-region />

      <div className={`flex flex-shrink-0 items-center gap-2${inPluginDomain ? ' max-md:order-1 max-md:h-11 max-md:w-full max-md:justify-end' : ''}`}>
        <SlideSegmented items={navItems} value={activeMode} onChange={handleModeChange} shareKey="domain" shortcuts={shortcutHints} />

        <button
          onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken cursor-pointer transition-colors duration-200"
          aria-label="Search"
        >
          <Search size={15} strokeWidth={1.75} />
        </button>

        <AccountMenu variant="bar" />

        <WindowControls />
      </div>
    </div>
  )
}
