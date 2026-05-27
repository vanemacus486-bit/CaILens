import { StorageFolderSelector } from './StorageFolderSelector'

export function SettingsStorage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {'存储'}
      </h1>
      <StorageFolderSelector />
    </div>
  )
}
