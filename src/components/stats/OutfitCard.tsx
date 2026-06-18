import type { DailyOutfit } from '@/domain/dailyContext'
import type { AppLanguage } from '@/domain/settings'

interface Props {
  outfits: DailyOutfit[]
  language: AppLanguage
}

// 占位组件：穿搭功能暂未推出，暂不消费 props（保留 Props 供调用方类型校验）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function OutfitCard(_props: Props) {
  return (
    <div className="outfit-placeholder">
      <span className="outfit-placeholder-icon">👔</span>
      <span className="outfit-placeholder-text">{'穿搭功能暂未推出'}</span>
      <style>{OUTFIT_PLACEHOLDER_CSS}</style>
    </div>
  )
}

const OUTFIT_PLACEHOLDER_CSS = `
.outfit-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: var(--heatmap-ink-3);
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
}
.outfit-placeholder-icon {
  font-size: 36px;
  opacity: 0.5;
}
.outfit-placeholder-text {
  font-size: 15px;
  letter-spacing: 0.04em;
  color: var(--heatmap-ink-3);
}
`
