import type { Category } from '@/domain/category'
import type { DiagnosisResult } from '@/domain/diagnosis'

interface DiagnosisCardsProps {
  diagnosis: DiagnosisResult
  categories: Category[]
  language: 'zh' | 'en'
}

const DIAMOND = '◆'

export function DiagnosisCards({ diagnosis, language }: DiagnosisCardsProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  if (diagnosis.totalActual === 0) {
    return (
      <div
        className="rounded-lg px-5 py-5"
        style={{ backgroundColor: '#EDE8DA' }}
      >
        <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 13, color: '#6F6453' }}>
          {t('暂无足够数据生成诊断，继续记录吧。', 'Not enough data for diagnosis yet. Keep tracking.')}
        </div>
      </div>
    )
  }

  const iconColor = 'var(--c-active, #C8693E)'

  return (
    <div
      className="rounded-lg px-5 py-5 space-y-4"
      style={{ backgroundColor: '#EDE8DA' }}
    >
      {diagnosis.items.map((item, i) => (
        <div key={i} className="flex gap-3">
          <span style={{ color: iconColor, fontSize: 13, lineHeight: '1.5', flexShrink: 0 }}>
            {DIAMOND}
          </span>
          <div className="min-w-0">
            <div
              className="text-sm font-semibold mb-0.5"
              style={{
                fontFamily: "'Noto Sans SC', sans-serif",
                color: '#2E2823',
              }}
            >
              {language === 'zh' ? item.titleZh : item.titleEn}
            </div>
            <div
              className="text-sm leading-relaxed"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                color: '#6F6453',
              }}
            >
              {language === 'zh' ? item.descZh : item.descEn}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
