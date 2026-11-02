/**
 * 设置页通用页头。
 *
 * 所有设置页曾经各写一份 h1：有的 `text-xl font-medium`，有的 `font-semibold`，
 * 有的带图标，有的不带——同一层级出现三种字号。这里收敛成一处，
 * 页面只负责传标题与一句说明。
 */
export function SettingsHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-serif text-xl font-medium tracking-tight text-text-primary">
        {title}
      </h1>
      {description && (
        <p className="font-sans text-sm text-text-tertiary">{description}</p>
      )}
    </div>
  )
}
