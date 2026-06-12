import { useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { Search, Sun, Moon } from 'lucide-react'
import { WeekScreen, getNavLabel, type CalMode } from './WeekScreen'
import { ActionScreen } from './ActionScreen'
import { StatsScreen } from './StatsScreen'

type Screen = 'week' | 'action' | 'stats'
const today = new Date()

const TABS: { id: Screen; label: string; kbd: string }[] = [
  { id: 'week', label: '日历', kbd: '1' },
  { id: 'action', label: '规划', kbd: '2' },
  { id: 'stats', label: '复盘', kbd: '3' },
]
const MODES: { id: CalMode; label: string }[] = [
  { id: 'week', label: '周' },
  { id: 'day', label: '日' },
  { id: 'month', label: '月' },
]

export function ProtoApp() {
  const [screen, setScreen] = useState<Screen>('week')
  const [mode, setMode] = useState<CalMode>('week')
  const [offset, setOffset] = useState(0)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('cailens-proto-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '1') setScreen('week')
      else if (e.key === '2') setScreen('action')
      else if (e.key === '3') setScreen('stats')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const changeMode = (m: CalMode) => { setMode(m); setOffset(0) }
  const nav = getNavLabel(mode, offset)

  return (
    <div className="app">
      <header className="topnav">
        <div className="topnav-brand">
          <span className="dot" />
          <span className="name">CaILens</span>
        </div>
        <nav className="topnav-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-tab${screen === t.id ? ' active' : ''}`}
              onClick={() => setScreen(t.id)}
            >
              {t.label}<span className="kbd">{t.kbd}</span>
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <div className="topnav-controls">
          {screen === 'week' && (
            <>
              <div className="weeknav">
                <button className="arrow" onClick={() => setOffset((o) => o - 1)} aria-label="上一个">‹</button>
                <button className="label" onClick={() => setOffset(0)}>
                  <span className="range">{nav.range}</span>
                  {nav.wk && <span className="wk">{nav.wk}</span>}
                </button>
                <button className="arrow" onClick={() => setOffset((o) => o + 1)} aria-label="下一个">›</button>
              </div>
              <div className="seg">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    className={mode === m.id ? 'active' : ''}
                    onClick={() => changeMode(m.id)}
                  >{m.label}</button>
                ))}
              </div>
            </>
          )}
          <button className="icon-btn" title="搜索"><Search size={16} /></button>
          <button className="icon-btn" title="切换主题" onClick={() => setDark((d) => !d)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <div className="screen-area">
        {screen === 'week' && (
          <WeekScreen
            mode={mode}
            offset={offset}
            onPickDay={(d) => { setMode('day'); setOffset(differenceInCalendarDays(d, today)) }}
          />
        )}
        {screen === 'action' && <ActionScreen />}
        {screen === 'stats' && <StatsScreen />}
      </div>
    </div>
  )
}
