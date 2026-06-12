import { useState } from 'react'
import { Check, Folder, Target, Plus } from 'lucide-react'
import { TODOS, PROJECTS, CAT_VAR, type MockTodo, type Pri } from './mock'

const PRI_LABEL: Record<Pri, string> = { high: '高', medium: '中', low: '低' }
const PRI_COLOR: Record<Pri, string> = { high: 'var(--danger)', medium: 'var(--accent)', low: 'var(--ink-4)' }
const PRIS: Pri[] = ['high', 'medium', 'low']

function TaskRow({ t, onToggle }: { t: MockTodo; onToggle: () => void }) {
  return (
    <div className={`task${t.done ? ' done' : ''}`} onClick={onToggle}>
      <span className="check">{t.done && <Check size={10} color="#fff" strokeWidth={3} />}</span>
      <span className="tt">{t.title}</span>
      {t.cat && <span className="cat-dot" style={{ background: CAT_VAR[t.cat], marginLeft: 'auto' }} />}
      <span className="pdot" style={{ background: PRI_COLOR[t.pri], marginLeft: t.cat ? 0 : 'auto' }} />
    </div>
  )
}

export function ActionScreen() {
  const [todos, setTodos] = useState<MockTodo[]>(TODOS)
  const toggle = (id: string) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  const active = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)
  const focus = active.filter((t) => t.focus)
  const byPri = (p: Pri) => active.filter((t) => t.pri === p)

  return (
    <div className="page">
      <div className="page-inner wide">
        <div className="page-head">
          <div>
            <div className="title">规划</div>
            <div className="sub">{active.length} 项待办 · {focus.length} 项聚焦 · {done.length} 项已完成</div>
          </div>
          <div className="page-head-controls">
            <button className="btn accent"><Plus size={14} /> 新建</button>
          </div>
        </div>

        <div className="action-cols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {focus.length > 0 && (
              <div className="card">
                <div className="card-head">
                  <div className="card-title serif" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Target size={15} style={{ color: 'var(--accent)' }} /> 今日聚焦
                  </div>
                  <span className="card-note">{focus.length} 项</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {focus.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggle(t.id)} />)}
                </div>
              </div>
            )}

            <div>
              <div className="card-head" style={{ marginBottom: 12 }}>
                <div className="card-title">按优先级</div>
                <span className="card-note">{active.length} 项待办</span>
              </div>
              <div className="matrix">
                <div className="corner" />
                {PRIS.map((p) => (
                  <div key={p} className="colhead" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className="pdot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: PRI_COLOR[p] }} />
                    {PRI_LABEL[p]}
                  </div>
                ))}
                <div className="rowhead">优先级</div>
                {PRIS.map((p) => {
                  const items = byPri(p)
                  return (
                    <div key={p} className={`qcell${p === 'high' ? ' hot' : ''}`}>
                      {items.length === 0
                        ? <span className="card-note" style={{ margin: 'auto', color: 'var(--ink-4)' }}>—</span>
                        : items.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggle(t.id)} />)}
                    </div>
                  )
                })}
              </div>
            </div>

            {done.length > 0 && (
              <div className="card flat">
                <div className="card-head">
                  <div className="card-title muted">已完成</div>
                  <span className="card-note">{done.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {done.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggle(t.id)} />)}
                </div>
              </div>
            )}
          </div>

          <aside className="card" style={{ alignSelf: 'start' }}>
            <div className="card-head">
              <div className="card-title serif" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Folder size={15} style={{ color: 'var(--ink-3)' }} /> 项目
              </div>
              <span className="card-note">{PROJECTS.length}</span>
            </div>
            <div>
              {PROJECTS.map((p) => (
                <div key={p.id} className="proj-row">
                  <span className="cat-dot" style={{ background: CAT_VAR[p.cat] }} />
                  <span className="nm">{p.name}</span>
                  <span className="ct num">{p.active}<span style={{ color: 'var(--ink-4)' }}> / {p.active + p.done}</span></span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
