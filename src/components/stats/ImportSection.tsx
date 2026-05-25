import { useState, useRef } from 'react'
import { FileJson, FileSpreadsheet, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { importJson, importCsv } from '@/lib/jsonCsvImport'
import { importCailens } from '@/lib/cailensExport'
import type { ImportStats } from '@/lib/jsonCsvImport'
import type { CailensImportResult } from '@/lib/cailensExport'

interface ImportSectionProps {
  language: 'zh' | 'en'
}

type ImportStatus = 'idle' | 'importing' | 'done' | 'error'

export function ImportSection({ language }: ImportSectionProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [result, setResult] = useState<ImportStats | CailensImportResult | null>(null)
  const [error, setError] = useState('')
  const [cailensPassphrase, setCailensPassphrase] = useState('')
  const [cailensFile, setCailensFile] = useState<{ name: string; text: string } | null>(null)

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const cailensInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setError('')
    setCailensPassphrase('')
    setCailensFile(null)
  }

  async function handleJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('importing')
    setError('')
    try {
      const text = await file.text()
      const stats = await importJson(text)
      setResult(stats)
      setStatus(stats.imported > 0 ? 'done' : 'error')
      if (stats.imported === 0) setError('没有可导入的有效事件')
    } catch (err) {
      setStatus('error')
      setError((err as Error).message)
    }
    if (jsonInputRef.current) jsonInputRef.current.value = ''
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('importing')
    setError('')
    try {
      const text = await file.text()
      const stats = await importCsv(text)
      setResult(stats)
      setStatus(stats.imported > 0 ? 'done' : 'error')
      if (stats.imported === 0) setError('没有可导入的有效事件')
    } catch (err) {
      setStatus('error')
      setError((err as Error).message)
    }
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  function handleCailensFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      setCailensFile({ name: file.name, text })
    })
    if (cailensInputRef.current) cailensInputRef.current.value = ''
  }

  async function handleCailensRestore() {
    if (!cailensFile || !cailensPassphrase) return
    setStatus('importing')
    setError('')
    try {
      const stats = await importCailens(cailensFile.text, cailensPassphrase)
      setResult(stats)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError((err as Error).message)
    }
  }

  return (
    <div className="bg-surface-raised border border-border-subtle p-6">
      <h3 className="font-serif text-sm font-semibold text-text-primary mb-1">
        {'导入数据'}
      </h3>
      <p className="text-body-xs text-text-tertiary mb-4">
        {'从 JSON、CSV 或 .cailens 备份中恢复数据。'}
      </p>

      {/* Status banner */}
      {status === 'done' && result && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-xs text-green-700 dark:text-green-300">
            {'tables' in result ? (
              t('已恢复 ' + Object.values(result.tables).reduce((a, b) => a + b, 0) + ' 条记录', `Restored ${Object.values(result.tables).reduce((a, b) => a + b, 0)} records`)
            ) : (
              `已导入 ${result.imported} 条事件`
            )}
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Import buttons */}
      <div className="flex gap-2.5 items-center flex-wrap">
        {/* JSON import */}
        <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleJsonFile} />
        <button
          onClick={() => jsonInputRef.current?.click()}
          disabled={status === 'importing'}
          className="inline-flex items-center gap-1.5 bg-surface-base border border-border-default px-[18px] py-2 text-xs font-sans font-medium text-text-secondary cursor-pointer rounded-sm transition-colors duration-200 hover:bg-surface-sunken hover:border-border-default hover:text-text-primary disabled:opacity-50"
        >
          {status === 'importing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileJson size={12} strokeWidth={1.75} />}
          {'导入 JSON'}
        </button>

        {/* CSV import */}
        <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
        <button
          onClick={() => csvInputRef.current?.click()}
          disabled={status === 'importing'}
          className="inline-flex items-center gap-1.5 bg-surface-base border border-border-default px-[18px] py-2 text-xs font-sans font-medium text-text-secondary cursor-pointer rounded-sm transition-colors duration-200 hover:bg-surface-sunken hover:border-border-default hover:text-text-primary disabled:opacity-50"
        >
          {status === 'importing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet size={12} strokeWidth={1.75} />}
          {'导入 CSV'}
        </button>

        {/* .cailens restore */}
        {!cailensFile ? (
          <>
            <input ref={cailensInputRef} type="file" accept=".cailens" className="hidden" onChange={handleCailensFile} />
            <button
              onClick={() => cailensInputRef.current?.click()}
              disabled={status === 'importing'}
              className="inline-flex items-center gap-1.5 bg-surface-base border border-border-default px-[18px] py-2 text-xs font-sans font-medium text-text-secondary cursor-pointer rounded-sm transition-colors duration-200 hover:bg-surface-sunken hover:border-border-default hover:text-text-primary disabled:opacity-50"
            >
              <Lock size={12} strokeWidth={1.75} />
              {'恢复 .cailens'}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-tertiary italic">{cailensFile.name}</span>
            <input
              type="password"
              placeholder={'输入密码'}
              value={cailensPassphrase}
              onChange={(e) => setCailensPassphrase(e.target.value)}
              className="w-40 px-2 py-1.5 text-xs rounded border border-border-default bg-surface-base text-text-primary outline-none focus:border-accent"
              autoFocus
            />
            <button
              onClick={handleCailensRestore}
              disabled={!cailensPassphrase || status === 'importing'}
              className="inline-flex items-center gap-1 bg-accent text-white px-3 py-1.5 text-xs font-medium rounded-sm transition-colors duration-200 hover:bg-accent-hover disabled:opacity-50 cursor-pointer border-none"
            >
              {status === 'importing' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {'恢复'}
            </button>
            <button
              onClick={reset}
              className="text-xs text-text-tertiary underline cursor-pointer bg-transparent border-none hover:text-text-secondary"
            >
              {'取消'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
