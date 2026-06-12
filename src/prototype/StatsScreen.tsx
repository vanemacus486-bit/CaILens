import { useState } from 'react'
import { TrendingUp, TrendingDown, Activity, BarChart, Moon } from 'lucide-react'
import {
  WEEK_TREND, SLEEP, HEATMAP, CAT_LABEL, CAT_VAR, fmtMin, type WeekPoint,
} from './mock'

type TrendCat = 'accent' | 'sage' | 'sand' | 'sky' | 'rose'
const TREND_CATS: TrendCat[] = ['accent', 'sage', 'sand', 'sky', 'rose']
const val = (w: WeekPoint, c: TrendCat): number => w[c]

const avg = (c: TrendCat) => WEEK_TREND.reduce((s, w) => s + val(w, c), 0) / WEEK_TREND.length
const last = (c: TrendCat) => val(WEEK_TREND[WEEK_TREND.length - 1], c)

/* ── 堆叠面积：每周时间构成 ───────────────────────────────────── */
function TrendChart() {
  const W = 660, H = 240, padL = 8, padR = 8, padT = 16, padB = 24
  const iw = W - padL - padR, ih = H - padT - padB
  const n = WEEK_TREND.length
  const totals = WEEK_TREND.map((w) => TREND_CATS.reduce((s, c) => s + val(w, c), 0))
  const maxTotal = Math.max(...totals) * 1.04
  const x = (i: number) => padL + (i / (n - 1)) * iw
  const y = (v: number) => padT + ih - (v / maxTotal) * ih

  const bands = TREND_CATS.map((c, ci) => {
    const below = WEEK_TREND.map((w) => TREND_CATS.slice(0, ci).reduce((s, cc) => s + val(w, cc), 0))
    const above = WEEK_TREND.map((w, i) => below[i] + val(w, c))
    const top = above.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    const bot = below.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).reverse()
    return { c, pts: [...top, ...bot].join(' ') }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="每周时间构成趋势">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + ih * f} y2={padT + ih * f}
          stroke="var(--line)" strokeWidth={1} strokeDasharray="2 4" />
      ))}
      {bands.map((b) => (
        <polygon key={b.c} points={b.pts}
          fill={CAT_VAR[b.c]} fillOpacity={0.34}
          stroke={CAT_VAR[b.c]} strokeWidth={1.4} strokeOpacity={0.7} strokeLinejoin="round" />
      ))}
      {WEEK_TREND.map((w, i) => (
        <text key={w.week} x={x(i)} y={H - 6} textAnchor="middle"
          fontFamily="var(--f-mono)" fontSize={9} fill="var(--ink-3)">{w.week}</text>
      ))}
    </svg>
  )
}

/* ── 睡眠节律：每夜入睡→起床 ─────────────────────────────────── */
function SleepChart() {
  const W = 660, H = 220, padL = 36, padR = 8, padT = 14, padB = 22
  const iw = W - padL - padR, ih = H - padT - padB
  const n = SLEEP.length
  const lo = 22 * 60, hi = 22 * 60 + 11 * 60 // 22:00 → 09:00 次日
  const x = (i: number) => padL + (i / (n - 1)) * iw
  const y = (m: number) => padT + ((m - lo) / (hi - lo)) * ih
  const grid = [22 * 60 + 60, 24 * 60, 24 * 60 + 3 * 60, 24 * 60 + 6 * 60]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="睡眠节律">
      {grid.map((m) => (
        <g key={m}>
          <line x1={padL} x2={W - padR} y1={y(m)} y2={y(m)}
            stroke="var(--line)" strokeWidth={1} strokeDasharray={m === 24 * 60 ? '0' : '2 4'}
            strokeOpacity={m === 24 * 60 ? 0.8 : 1} />
          <text x={4} y={y(m) + 3} fontFamily="var(--f-mono)" fontSize={9} fill="var(--ink-3)">
            {fmtMin(m % 1440)}
          </text>
        </g>
      ))}
      {SLEEP.map((s, i) => {
        const ys = y(s.sleep), yw = y(s.wake + 1440)
        return (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={ys} y2={yw}
              stroke="var(--c-sage)" strokeWidth={3.5} strokeOpacity={0.28} strokeLinecap="round" />
            <circle cx={x(i)} cy={ys} r={2.6} fill="var(--c-sky)" />
            <circle cx={x(i)} cy={yw} r={2.6} fill="var(--accent)" />
          </g>
        )
      })}
    </svg>
  )
}

function Heatmap() {
  const color = (v: number) =>
    v === 0 ? 'var(--sunken)' : `color-mix(in srgb, var(--c-sage) ${v * 20 + 16}%, var(--sunken))`
  return (
    <div className="heat">
      {HEATMAP.map((v, i) => <span key={i} className="cell" style={{ background: color(v) }} />)}
    </div>
  )
}

function StatCard({ c }: { c: TrendCat }) {
  const v = last(c)
  const d = v - avg(c)
  const up = d >= 0
  return (
    <div className="stat">
      <div className="k">{CAT_LABEL[c]}</div>
      <div className="v num">{v}<span className="u">时/周</span></div>
      <div className={`d ${up ? 'up' : 'down'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {Math.abs(d).toFixed(1)} h vs 均值
      </div>
    </div>
  )
}

const SUBTABS: { id: 'trend' | 'heat' | 'sleep'; label: string; icon: typeof BarChart }[] = [
  { id: 'trend', label: '趋势', icon: BarChart },
  { id: 'heat', label: '热力', icon: Activity },
  { id: 'sleep', label: '睡眠', icon: Moon },
]

export function StatsScreen() {
  const [tab, setTab] = useState<'rhythm' | 'daily'>('rhythm')
  const [sub, setSub] = useState<'trend' | 'heat' | 'sleep'>('trend')

  const lastWeek = WEEK_TREND[WEEK_TREND.length - 1]
  const totalLast = TREND_CATS.reduce((s, c) => s + val(lastWeek, c), 0)

  return (
    <>
      <div className="tabs">
        <button className={`tab${tab === 'rhythm' ? ' active' : ''}`} onClick={() => setTab('rhythm')}>作息</button>
        <button className={`tab${tab === 'daily' ? ' active' : ''}`} onClick={() => setTab('daily')}>日常</button>
      </div>

      <div className="page">
        <div className="page-inner wide">
          {tab === 'rhythm' && (
            <div className="tab-pane" key="rhythm">
              <div className="page-head">
                <div>
                  <div className="title">作息复盘</div>
                  <div className="sub">最近 8 周 · 第 {lastWeek.week.slice(1)} 周</div>
                </div>
              </div>

              <div className="stat-grid" style={{ marginBottom: 22 }}>
                {(['accent', 'sage', 'sand', 'sky'] as TrendCat[]).map((c) => <StatCard key={c} c={c} />)}
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title serif">
                    {sub === 'trend' ? '时间构成趋势' : sub === 'heat' ? '活跃度热力' : '睡眠节律'}
                  </div>
                  <div className="subtabs">
                    {SUBTABS.map((st) => (
                      <button key={st.id} className={`subtab${sub === st.id ? ' active' : ''}`} onClick={() => setSub(st.id)}>
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tab-pane" key={sub}>
                  {sub === 'trend' && (
                    <>
                      <TrendChart />
                      <div className="legend" style={{ marginTop: 14 }}>
                        {TREND_CATS.map((c) => (
                          <span key={c} className="it">
                            <span className="cat-dot" style={{ background: CAT_VAR[c] }} /> {CAT_LABEL[c]}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  {sub === 'heat' && (
                    <>
                      <Heatmap />
                      <div className="legend" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                        <span className="it" style={{ color: 'var(--ink-3)' }}>少</span>
                        {[0, 1, 2, 3, 4].map((v) => (
                          <span key={v} className="cell" style={{
                            width: 11, height: 11, borderRadius: 2,
                            background: v === 0 ? 'var(--sunken)' : `color-mix(in srgb, var(--c-sage) ${v * 20 + 16}%, var(--sunken))`,
                          }} />
                        ))}
                        <span className="it" style={{ color: 'var(--ink-3)' }}>多</span>
                      </div>
                    </>
                  )}
                  {sub === 'sleep' && (
                    <>
                      <SleepChart />
                      <div className="legend" style={{ marginTop: 10 }}>
                        <span className="it"><span className="cat-dot" style={{ background: 'var(--c-sky)' }} /> 入睡</span>
                        <span className="it"><span className="cat-dot" style={{ background: 'var(--accent)' }} /> 起床</span>
                        <span className="it" style={{ color: 'var(--ink-3)' }}>柱长 = 在床时长</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'daily' && (
            <div className="tab-pane" key="daily">
              <div className="page-head">
                <div>
                  <div className="title">日常构成</div>
                  <div className="sub">本周 {totalLast} 小时已记录</div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title serif">类别分布</div>
                  <span className="card-note">第 {lastWeek.week.slice(1)} 周</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {TREND_CATS.map((c) => {
                    const v = val(lastWeek, c)
                    const pct = (v / totalLast) * 100
                    return (
                      <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="cat-dot" style={{ background: CAT_VAR[c] }} />
                        <span style={{ width: 44, fontSize: 'var(--t-label)', color: 'var(--ink-2)' }}>{CAT_LABEL[c]}</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--sunken)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: CAT_VAR[c], borderRadius: 'var(--r-pill)', transition: 'width var(--d2) var(--ease)' }} />
                        </div>
                        <span className="num" style={{ width: 78, textAlign: 'right', fontSize: 'var(--t-label)', color: 'var(--ink-2)' }}>
                          {v}h · {pct.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
