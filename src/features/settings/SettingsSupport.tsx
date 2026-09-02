import { useT } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'
import type { AppLanguage } from '@/i18n/types'
import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { openExternal } from '@/lib/platform'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { SPONSOR_CHANNELS, type SponsorChannel } from '@/lib/sponsor'
import { cn } from '@/lib/utils'

type T = (key: TranslationKey, ...args: (string | number)[]) => string

function ChannelCard({ channel, t, language }: { channel: SponsorChannel; t: T; language: AppLanguage }) {
  const [copied, setCopied] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(channel.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard 不可用时静默忽略 */
    }
  }

  const open = async () => {
    if (!await openExternal(channel.url)) void copy()
  }

  const qrSrc = channel.qrImage ? `${import.meta.env.BASE_URL}${channel.qrImage}` : null

  return (
    <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="text-sm font-sans font-medium text-text-primary">
            {language === 'zh' ? channel.nameZh : channel.nameEn}
          </h2>
          <span className="text-[11px] font-sans text-text-tertiary">
            {channel.region === 'cn' ? t('support.regionChina') : t('support.regionInternational')}
          </span>
        </div>
        <p className="text-xs text-text-tertiary font-sans mb-3">
          {language === 'zh' ? channel.descZh : channel.descEn}
        </p>

        {qrSrc && !qrFailed && (
          <div className="flex flex-col items-center gap-2 mb-3">
            <img
              src={qrSrc}
              alt={t('support.qrCodeAlt')}
              onError={() => setQrFailed(true)}
              className="w-40 h-40 rounded-lg border border-border-subtle bg-white object-contain p-2"
            />
            <span className="text-[11px] text-text-tertiary font-sans">
              {t('support.scanToSupport')}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <code className="flex-1 truncate text-xs font-mono text-text-secondary bg-surface-sunken rounded-md px-2.5 py-1.5">
            {channel.url}
          </code>
          <button
            onClick={copy}
            style={copied ? { color: 'var(--color-text-success)' } : undefined}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
              !copied && 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken',
            )}
            aria-label={t('support.copyLink')}
          >
            {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.75} />}
            {copied ? t('support.copied') : t('support.copy')}
          </button>
          <button
            onClick={() => void open()}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-sans font-medium text-white bg-accent hover:bg-accent-hover transition-colors duration-200 cursor-pointer border-none"
            aria-label={t('support.openLink')}
          >
            <ExternalLink size={13} strokeWidth={1.75} />
            {t('support.open')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SettingsSupport() {
  const t = useT()
  const language = useAppSettingsStore((s) => s.settings.language)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {t('support.title')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {t('support.description')}
        </p>
      </div>

      {SPONSOR_CHANNELS.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} t={t} language={language} />
      ))}

      <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
        {t('support.footer')}
      </p>
    </div>
  )
}
