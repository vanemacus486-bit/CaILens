import { type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
}

export function Drawer({ open, onOpenChange, title, children }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/20 dark:bg-black/40',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
            'transition-opacity duration-300',
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed right-0 top-0 h-full z-50',
            'w-[min(50vw,480px)]',
            'bg-surface-base border-l border-border-subtle',
            'shadow-lg outline-none',
            'data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full',
            'transition-transform duration-300 ease-out',
            'flex flex-col',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {title ?? 'Drawer'}
          </DialogPrimitive.Title>

          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
            <DialogPrimitive.Close className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200">
              <X size={18} strokeWidth={1.75} />
            </DialogPrimitive.Close>
            {title && (
              <span className="font-serif text-base text-text-primary">{title}</span>
            )}
            <div className="w-8" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
