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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: 'zh' | 'en'
}

type Status = 'idle' | 'exporting' | 'done' | 'error'

export function EncryptedExportDialog({ open, onOpenChange, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

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
          <DialogTitle>{t('加密导出 .cailens', 'Encrypted Export (.cailens)')}</DialogTitle>
          <DialogDescription>
            {t(
              '所有数据将被压缩并用 age 加密。导出的 .cailens 文件只能通过密码恢复。请牢记密码——没有密码无法解密。',
              'All data will be compressed and encrypted with age. The exported .cailens file can only be restored with this passphrase. Keep it safe — there is no recovery.',
            )}
          </DialogDescription>
        </DialogHeader>

        {status === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <ShieldCheck className="h-10 w-10 text-green-600" />
            <p className="text-sm text-text-secondary">
              {t('导出成功！文件已下载。', 'Export successful! File downloaded.')}
            </p>
            <Button variant="outline" size="sm" onClick={handleClose}>
              {t('关闭', 'Close')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <input
              type="password"
              placeholder={t('输入密码（至少 4 位）', 'Enter passphrase (min 4 chars)')}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-base text-text-primary outline-none focus:border-accent transition-colors duration-200"
              autoFocus
            />
            <input
              type="password"
              placeholder={t('再次确认密码', 'Confirm passphrase')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-base text-text-primary outline-none focus:border-accent transition-colors duration-200"
            />
            {passphrase && confirm && passphrase !== confirm && (
              <p className="text-xs text-color-text-danger">{t('密码不一致', 'Passphrases do not match')}</p>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-color-text-danger">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{t('导出失败：', 'Export failed: ')}{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                {t('取消', 'Cancel')}
              </Button>
              <Button
                size="sm"
                disabled={!canExport}
                onClick={handleExport}
              >
                {status === 'exporting' ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('导出中…', 'Exporting…')}</>
                ) : (
                  t('导出', 'Export')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
