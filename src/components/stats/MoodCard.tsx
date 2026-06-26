// 占位组件：情绪复盘暂未推出，无数据源（参照 OutfitCard 的占位形态）
export function MoodCard() {
  return (
    <div className="mood-placeholder">
      <span className="mood-placeholder-icon">🌤️</span>
      <span className="mood-placeholder-text">{'情绪功能暂未推出'}</span>
      <style>{MOOD_PLACEHOLDER_CSS}</style>
    </div>
  )
}

const MOOD_PLACEHOLDER_CSS = `
.mood-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: var(--heatmap-ink-3);
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
}
.mood-placeholder-icon {
  font-size: 36px;
  opacity: 0.5;
}
.mood-placeholder-text {
  font-size: 15px;
  letter-spacing: 0.04em;
  color: var(--heatmap-ink-3);
}
`
