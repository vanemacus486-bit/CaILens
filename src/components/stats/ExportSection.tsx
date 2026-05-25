import { useState } from 'react'
import { Lock, Calendar } from 'lucide-react'
import { getEventRepo } from '@/data/getRepositories'
import { generateIcs, downloadIcs } from '@/lib/icsExport'
import { EncryptedExportDialog } from './EncryptedExportDialog'

interface ExportSectionProps {
  language: 'zh' | 'en'
}

export function ExportSection({ language }: ExportSectionProps) {
  const [expClk, setExpClk] = useState<string | null>(null)
  const [encDialogOpen, setEncDialogOpen] = useState(false)
  const [icsBusy, setIcsBusy] = useState(false)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  async function doExport(format: 'csv' | 'json') {
    setExpClk(format)
    setTimeout(() => setExpClk(null), 1400)

    const now = Date.now()
    const events = await getEventRepo().getByTimeRange(0, now)
    events.sort((a, b) => a.startTime - b.startTime)

    let content: string
    let mime: string
    let ext: string

    if (format === 'json') {
      content = JSON.stringify(events, null, 2)
      mime = 'application/json'
      ext = 'json'
    } else {
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

  async function doExportIcs() {
    setIcsBusy(true)
    try {
      const now = Date.now()
      const events = await getEventRepo().getByTimeRange(0, now)
      events.sort((a, b) => a.startTime - b.startTime)
      const ics = generateIcs(events)
      downloadIcs(ics)
    } finally {
      setIcsBusy(false)
    }
  }

  return (
    <div className="bg-surface-raised border border-border-subtle p-6">
      <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
        {'导出与所有权'}
      </h3>
      <p className="text-body-xs text-text-tertiary mb-4">
        {'随时下载你的记录，任何格式，任何理由。'}
      </p>

      <div className="flex gap-2.5 items-center flex-wrap">
        {(['CSV', 'JSON'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => doExport(fmt.toLowerCase() as 'csv' | 'json')}
            className="bg-surface-base border border-border-default px-[18px] py-2 text-xs font-sans font-medium text-text-secondary cursor-pointer rounded-sm transition-colors duration-200 hover:bg-surface-sunken hover:border-border-default hover:text-text-primary"
          >
            {expClk === fmt.toLowerCase() ? '已准备 ✓' : `导出为 ${fmt}`}
          </button>
        ))}

        {/* ICS export */}
        <button
          onClick={doExportIcs}
          disabled={icsBusy}
          className="inline-flex items-center gap-1.5 bg-surface-base border border-border-default px-[18px] py-2 text-xs font-sans font-medium text-text-secondary cursor-pointer rounded-sm transition-colors duration-200 hover:bg-surface-sunken hover:border-border-default hover:text-text-primary disabled:opacity-50"
        >
          <Calendar size={12} strokeWidth={1.75} />
          {icsBusy ? '生成中…' : '导出为 ICS'}
        </button>

        {/* .cailens encrypted export */}
        <button
          onClick={() => setEncDialogOpen(true)}
          className="inline-flex items-center gap-1.5 bg-surface-base border border-border-default px-[18px] py-2 text-xs font-sans font-medium text-text-secondary cursor-pointer rounded-sm transition-colors duration-200 hover:bg-surface-sunken hover:border-border-default hover:text-text-primary"
        >
          <Lock size={12} strokeWidth={1.75} />
          {'加密导出 (.cailens)'}
        </button>

        <span className="text-body-xs text-text-tertiary italic">
          {'所有数据存储在本地。不会离开你的设备。'}
        </span>
      </div>

      <EncryptedExportDialog open={encDialogOpen} onOpenChange={setEncDialogOpen} language={language} />
    </div>
  )
}
