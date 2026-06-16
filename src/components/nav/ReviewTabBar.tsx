import { useNavigate, useLocation } from 'react-router-dom'

export function ReviewTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const active = location.pathname.startsWith('/action') ? 'todo' : 'routine'

  return (
    <div className="shell-tabs">
      <button
        onClick={() => navigate('/action')}
        className={`shell-tab${active === 'todo' ? ' shell-tab-active' : ''}`}
      >
        {'待办'}
      </button>
      <button
        onClick={() => navigate('/stats')}
        className={`shell-tab${active === 'routine' ? ' shell-tab-active' : ''}`}
      >
        {'作息'}
      </button>
    </div>
  )
}
