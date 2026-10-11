import { LoaderCircle } from 'lucide-react'

import { Alert, AlertDescription } from '#/components/ui/alert.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'

import type { FormEvent, ReactNode } from 'react'

/**
 * The modal every create/edit form opens in. Its content unmounts when the
 * dialog closes, so the form inside starts from fresh defaults each time.
 *
 * The dialog is capped at the viewport height: the header and the form's
 * actions stay put while the fields scroll between them.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-6 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** The form body: fields, the request error if any, then the actions. */
export function DialogForm({
  onSubmit,
  error,
  isSubmitting,
  submitLabel,
  onCancel,
  children,
}: {
  onSubmit: () => void
  error: string
  isSubmitting: boolean
  submitLabel: string
  onCancel: () => void
  children: ReactNode
}) {
  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        event.stopPropagation()
        onSubmit()
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {children}
      </div>
      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
