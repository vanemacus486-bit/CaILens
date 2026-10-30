import { Plus } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * 周视图空态。
 *
 * 挂载点（WeekView.tsx:475）外面包着 `pointer-events-none`，因为整列空白处
 * 都是「点一下新建事件」的命中区。所以这里必须用 `inline` 变体——任何可点元素
 * 都会被列的点按吃掉，用户会感觉「点空白没反应」。
 *
 * 想在这里加入口，得先把新建事件的点击区从列挪到别的元素上，不能只改这个文件。
 */
export function WeekEmptyState() {
  const t = useT()
  return <EmptyState variant="inline" icon={Plus} title={t('week.emptyDayHint')} />
}
