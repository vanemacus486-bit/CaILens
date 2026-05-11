import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { getWeekStart, formatISODate } from '@/domain/time'

interface EventReferenceChipProps {
  title: string
  eventTime: number
}

export function EventReferenceChip({ title, eventTime }: EventReferenceChipProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    const weekStart = getWeekStart(new Date(eventTime), 1)
    navigate(`/?week=${formatISODate(weekStart)}`)
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 text-accent text-xs font-sans cursor-pointer hover:bg-accent/20 transition-colors duration-200 border-none"
      title={`Jump to ${title}`}
    >
      <Calendar size={10} />
      <span>{title}</span>
    </button>
  )
}
