import { LoaderCircle, RotateCw } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx'
import { Button } from '#/components/ui/button.tsx'
import { cn } from '#/lib/utils.ts'

import type { ReactNode } from 'react'

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function QueryError({
  error,
  onRetry,
  title = 'Could not load this data',
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{errorMessage(error)}</span>
        {onRetry ? (
          <Button variant="outline" size="xs" onClick={onRetry}>
            <RotateCw />
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <LoaderCircle className="text-muted-foreground size-5 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full [&_svg]:size-5">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {action}
    </div>
  )
}
