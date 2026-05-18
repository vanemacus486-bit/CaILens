import { useState, useCallback } from 'react'
import type { EventColor, CreateEventInput } from '@/domain/event'
import { deriveDefaultTimes, deriveDefaultColor } from '@/domain/quickLog'
import type { DefaultTimes } from '@/domain/quickLog'
import { getEventRepo } from '@/data/getRepositories'
import { useEventStore } from '@/stores/eventStore'
import { showUndoSnackbar } from '@/components/ui/snackbar'

export function useQuickLog() {
  const [open, setOpen] = useState(false)
  const [defaults, setDefaults] = useState<{
    times: DefaultTimes
    color: EventColor
  } | null>(null)

  const openDialog = useCallback(async () => {
    const last = await getEventRepo().getLatest()
    setDefaults({
      times: deriveDefaultTimes(last),
      color: deriveDefaultColor(last),
    })
    setOpen(true)
  }, [])

  const handleSave = useCallback(async (input: CreateEventInput): Promise<string> => {
    const event = await useEventStore.getState().createEvent(input)
    showUndoSnackbar(event.id)
    return event.id
  }, [])

  const handleUpdate = useCallback(async (id: string, description: string, location: string) => {
    await useEventStore.getState().updateEvent({
      id,
      description: description || undefined,
      location: location || undefined,
    })
  }, [])

  return { open, setOpen, defaults, openDialog, handleSave, handleUpdate }
}
