import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'

import type { ComponentProps } from 'react'
import type { AnyFieldApi } from '@tanstack/react-form'

type InputProps = Omit<
  ComponentProps<typeof Input>,
  'id' | 'name' | 'value' | 'onBlur' | 'onChange'
>

/**
 * One labelled text input bound to a TanStack Form field.
 *
 * `AnyFieldApi` is what lets a shared component accept a field from any form
 * shape; the values it carries are untyped, so they are narrowed here rather
 * than at every call site.
 */
export function AuthField({
  field,
  label,
  description,
  ...props
}: {
  field: AnyFieldApi
  label: string
  description?: string
} & InputProps) {
  const error = field.state.meta.errors[0]?.message as string | undefined
  const value = field.state.value as string

  const errorId = `${field.name}-error`
  const descriptionId = `${field.name}-description`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        name={field.name}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? errorId : description ? descriptionId : undefined
        }
        value={value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        {...props}
      />
      {description && !error ? (
        <p id={descriptionId} className="text-muted-foreground text-xs">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
