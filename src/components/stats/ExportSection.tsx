import { useState } from 'react'
import { eventRepository } from '@/data/eventRepository'

interface ExportSectionProps {
  language: 'zh' | 'en'
}

export function ExportSection({ language }: ExportSectionProps) {
  const [expClk, setExpClk] = useState<string | null>(null)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  async function doExport(format: 'csv' | 'json') {
    setExpClk(format)
    setTimeout(() => setExpClk(null), 1400)

    // Load all events from DB
    const now = Date.now()
    const events = await eventRepository.getByTimeRange(0, now)
    events.sort((a, b) => a.startTime - b.startTime)

    let content: string
    let mime: string
    let ext: string

    if (format === 'json') {
      content = JSON.stringify(events, null, 2)
      mime = 'application/json'
      ext = 'json'
    } else {
      // CSV
      const header = 'Date,Start,End,Title,Category,Description'
      const rows = events.map((e) => {
        const date  = new Date(e.startTime).toISOString().slice(0, 10)
        const start = new Date(e.startTime).toISOString()
        const end   = new Date(e.endTime).toISOString()
        const title = `"${(e.title || '').replace(/"/g, '""')}"`
        const desc  = `"${(e.description || '').replace(/"/g, '""')}"`
        return `${date},${start},${end},${title},${e.categoryId},${desc}`
      })
      content = [header, ...rows].join('\n')
      mime = 'text/csv'
      ext = 'csv'
    }

    const blob = new Blob([content], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `cailens-export.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-surface-raised border border-border-subtle p-6">
      <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
        {t('导出与所有权', 'Export & Ownership')}
      </h3>
      <p className="text-[11px] text-text-tertiary mb-4">
        {t('随时下载你的记录，任何格式，任何理由。', 'Download your records in any format, at any time, for any reason.')}
      </p>

      <div className="flex gap-2.5 items-center flex-wrap">
        {(['CSV', 'JSON'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => doExport(fmt.toLowerCase() as 'csv' | 'json')}
            className="bg-surface-base border border-border-default px-[18px] py-2 text-xs font-sans font-medium text-text-secondary cursor-pointer rounded-sm transition-all duration-150 hover:bg-surface-sunken hover:border-border-default hover:text-text-primary"
          >
            {expClk === fmt.toLowerCase() ? t('已准备 ✓', 'Prepared ✓') : t(`导出为 ${fmt}`, `Export as ${fmt}`)}
          </button>
        ))}
        <span className="text-[11px] text-text-tertiary italic">
          {t('所有数据存储在本地。不会离开你的设备。', 'All data lives locally. Nothing leaves your device.')}
        </span>
      </div>
    </div>
  )
}
