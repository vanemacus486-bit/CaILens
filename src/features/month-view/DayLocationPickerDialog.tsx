/**
 * # DayLocationPickerDialog — 日期位置选择弹窗
 *
 * 右键某天选择「设置位置」后弹出：
 * 1. 从已保存城市列表选取
 * 2. 或自定义输入地点名
 */
import { useState, useCallback } from 'react'
import { useLocationStore } from '@/stores/locationStore'
import { useT } from '@/i18n/useT'
import { MapPin, X } from 'lucide-react'

interface DayLocationPickerDialogProps {
  /** 要设置位置的日期（本地午夜 UTC ms） */
  date: number
  /** 初始地点名（编辑已有标记时） */
  initialName?: string
  /** 关闭弹窗 */
  onClose: () => void
}

export function DayLocationPickerDialog({
  date,
  initialName,
  onClose,
}: DayLocationPickerDialogProps) {
  const t = useT()
  const savedCities = useLocationStore((s) => s.savedCities)
  const setDayLocation = useLocationStore((s) => s.setDayLocation)
  const locationSettings = useLocationStore((s) => s.locationSettings)

  const [customName, setCustomName] = useState(initialName ?? '')
  const [saving, setSaving] = useState(false)

  const handlePickCity = useCallback(
    async (cityName: string, cityIndex: number) => {
      setSaving(true)
      try {
        await setDayLocation(date, cityName, cityIndex)
        onClose()
      } finally {
        setSaving(false)
      }
    },
    [date, setDayLocation, onClose],
  )

  const handleConfirmCustom = useCallback(async () => {
    const name = customName.trim()
    if (!name) return
    setSaving(true)
    try {
      await setDayLocation(date, name)
      onClose()
    } finally {
      setSaving(false)
    }
  }, [customName, date, setDayLocation, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && customName.trim()) {
        handleConfirmCustom()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [customName, handleConfirmCustom, onClose],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised rounded-xl shadow-lg w-72 max-h-80 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="font-sans text-sm font-medium text-text-primary">
            {t('dayLocation.setLocation')}
          </span>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Saved cities list */}
        {savedCities.length > 0 && (
          <div className="px-2 pb-1">
            <div className="font-sans text-[11px] text-text-tertiary font-medium px-2 py-1">
              {t('dayLocation.savedCities')}
            </div>
            <div className="flex flex-col gap-0.5">
              {savedCities.map((city, i) => (
                <button
                  key={i}
                  onClick={() => handlePickCity(city.cityName, i)}
                  disabled={saving}
                  className={[
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left',
                    'font-sans text-xs text-text-primary',
                    'bg-transparent border-none cursor-pointer',
                    'hover:bg-surface-base transition-colors duration-150',
                    saving ? 'opacity-50 pointer-events-none' : '',
                  ].join(' ')}
                >
                  <MapPin size={12} className="text-text-tertiary shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{city.cityName}</span>
                  {locationSettings &&
                    city.cityName === locationSettings.cityName && (
                      <span className="text-[10px] text-text-tertiary ml-auto shrink-0">
                        {t('dayLocation.active')}
                      </span>
                    )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Separator */}
        {savedCities.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="font-sans text-[10px] text-text-quaternary">{t('dayLocation.orCustom')}</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
        )}

        {/* Custom input */}
        <div className="px-3 pb-3">
          <div className="font-sans text-[11px] text-text-tertiary font-medium px-1 py-1">
            {t('dayLocation.customName')}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t('dayLocation.placeholder')}
              className={[
                'flex-1 px-2.5 py-1.5 rounded-md text-xs font-sans',
                'bg-surface-base border border-border-subtle',
                'text-text-primary placeholder:text-text-quaternary',
                'outline-none focus:border-accent transition-colors duration-150',
              ].join(' ')}
              autoFocus={savedCities.length === 0}
            />
            <button
              onClick={handleConfirmCustom}
              disabled={!customName.trim() || saving}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-sans font-medium',
                'bg-accent text-white border-none cursor-pointer',
                'hover:bg-accent/90 transition-colors duration-150',
                !customName.trim() || saving ? 'opacity-50 pointer-events-none' : '',
              ].join(' ')}
            >
              {t('dayLocation.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
