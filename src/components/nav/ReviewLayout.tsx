import { Outlet } from 'react-router-dom'

export function ReviewLayout() {
  return (
    <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
      <Outlet />
    </div>
  )
}
