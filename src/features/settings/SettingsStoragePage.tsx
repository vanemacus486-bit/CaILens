import { StorageFolderSelector } from './StorageFolderSelector'

export function SettingsStorage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] font-medium text-text-primary tracking-tight">
          存储
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          管理文件存储路径
        </p>
      </div>
      <StorageFolderSelector />
    </div>
  )
}
