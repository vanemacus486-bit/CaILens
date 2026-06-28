import { useT } from '@/i18n/useT'
import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { openExternal } from '@/lib/platform'
import { SPONSOR_CHANNELS, type SponsorChannel } from '@/lib/sponsor'
import { cn } from '@/lib/utils'

type T = (zh: string, en: string) => string

function ChannelCard({ channel, t }: { channel: SponsorChannel; t: T }) {
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

  const open = () => {
    // 桌面端 window.open 常被拦截 → 退而复制链接，提示用户去浏览器打开
    if (!openExternal(channel.url)) void copy()
  }

  const qrSrc = channel.qrImage ? `${import.meta.env.BASE_URL}${channel.qrImage}` : null

  return (
    <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="text-sm font-sans font-medium text-text-primary">
            {t(channel.nameZh, channel.nameEn)}
          </h2>
          <span className="text-[11px] font-sans text-text-tertiary">
            {channel.region === 'cn' ? t('国内', 'China') : t('海外', 'International')}
          </span>
        </div>
        <p className="text-xs text-text-tertiary font-sans mb-3">
          {t(channel.descZh, channel.descEn)}
        </p>

        {qrSrc && !qrFailed && (
          <div className="flex flex-col items-center gap-2 mb-3">
            <img
              src={qrSrc}
              alt={t('收款二维码', 'Payment QR code')}
              onError={() => setQrFailed(true)}
              className="w-40 h-40 rounded-lg border border-border-subtle bg-white object-contain p-2"
            />
            <span className="text-[11px] text-text-tertiary font-sans">
              {t('扫码支持', 'Scan to support')}
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
            aria-label={t('复制链接', 'Copy link')}
          >
            {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.75} />}
            {copied ? t('已复制', 'Copied') : t('复制', 'Copy')}
          </button>
          <button
            onClick={open}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-sans font-medium text-white bg-accent hover:bg-accent-hover transition-colors duration-200 cursor-pointer border-none"
            aria-label={t('打开链接', 'Open link')}
          >
            <ExternalLink size={13} strokeWidth={1.75} />
            {t('打开', 'Open')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SettingsSupport() {
  const t = useT()

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
        <ChannelCard key={channel.id} channel={channel} t={t} />
      ))}

      <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
        {t('support.footer')}
      </p>
    </div>
  )
}
