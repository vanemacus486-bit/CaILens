import { useState } from 'react'
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { exportCailens } from '@/lib/cailensExport'
import type { AppLanguage } from '@/i18n/types'
import { translate } from '@/i18n/useT'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: AppLanguage
}

type Status = 'idle' | 'exporting' | 'done' | 'error'

export function EncryptedExportDialog({ open, onOpenChange, language }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const tr = (key: string, ...args: (string | number)[]) => translate(key, language, ...args)

  const canExport = passphrase.length >= 4 && passphrase === confirm && status !== 'exporting'

  async function handleExport() {
    if (!canExport) return
    setStatus('exporting')
    setError('')
    try {
      await exportCailens(passphrase)
      setStatus('done')
      setPassphrase('')
      setConfirm('')
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    }
  }

  function handleClose() {
    setPassphrase('')
    setConfirm('')
    setStatus('idle')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tr('import.exportTitle')}</DialogTitle>
          <DialogDescription>
            {tr('import.exportDesc')}
          </DialogDescription>
        </DialogHeader>

        {status === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <ShieldCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
            <p className="text-sm text-text-secondary">
              {tr('import.exportSuccess')}
            </p>
            <Button variant="outline" size="sm" onClick={handleClose}>
              {tr('common.close')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <input
              type="password"
              placeholder={tr('import.passwordMin')}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-base text-text-primary outline-none focus:border-accent transition-colors duration-200"
              autoFocus
            />
            <input
              type="password"
              placeholder={tr('import.passwordConfirm')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-base text-text-primary outline-none focus:border-accent transition-colors duration-200"
            />
            {passphrase && confirm && passphrase !== confirm && (
              <p className="text-xs text-color-text-danger">{tr('import.passwordMismatch')}</p>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-color-text-danger">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{tr('import.exportFailed')}{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                {tr('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={!canExport}
                onClick={handleExport}
              >
                {status === 'exporting' ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {tr('import.exporting')}</>
                ) : (
                  tr('import.export')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
