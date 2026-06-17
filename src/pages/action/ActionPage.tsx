/**
 * # ActionPage — 规划 Tab
 *
 * 改造为路线图三段式视图（RoadmapView）。
 * 移除原有的「矩阵」和「日志」两个 tab 及其依赖。
 */

import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { RoadmapView } from '@/features/roadmap/RoadmapView'

export function ActionPage() {
  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      <div ref={usePageScrollRestore('/action')} className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
        <RoadmapView />
      </div>
    </div>
  )
}
