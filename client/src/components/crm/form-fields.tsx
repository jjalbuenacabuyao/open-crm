import { useId } from 'react'

import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { cn } from '#/lib/utils.ts'

import type { ComponentProps, ReactNode } from 'react'
import type { AnyFieldApi } from '@tanstack/react-form'

/**
 * Labelled inputs bound to TanStack Form fields, for the CRM forms.
 *
 * Unlike `AuthField`, ids come from `useId` rather than the field name: a page
 * can hold more than one form with a `name` field (a dialog over the settings
 * page), and duplicate ids would break the label association.
 */

function fieldError(field: AnyFieldApi): string | undefined {
  return field.state.meta.errors[0]?.message as string | undefined
}

function FieldShell({
  id,
  label,
  error,
  description,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {description && !error ? (
        <p id={`${id}-description`} className="text-muted-foreground text-xs">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function describedBy(id: string, error?: string, description?: string) {
  if (error) {
    return `${id}-error`
  }
  return description ? `${id}-description` : undefined
}

type InputProps = Omit<
  ComponentProps<typeof Input>,
  'id' | 'name' | 'value' | 'onBlur' | 'onChange'
>

export function TextField({
  field,
  label,
  description,
  className,
  ...props
}: {
  field: AnyFieldApi
  label: string
  description?: string
} & InputProps) {
  const id = useId()
  const error = fieldError(field)

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      description={description}
      className={className}
    >
      <Input
        id={id}
        name={field.name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, description)}
        value={field.state.value as string}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        {...props}
      />
    </FieldShell>
  )
}

export function TextareaField({
  field,
  label,
  className,
  rows = 4,
}: {
  field: AnyFieldApi
  label: string
  className?: string
  rows?: number
}) {
  const id = useId()
  const error = fieldError(field)

  return (
    <FieldShell id={id} label={label} error={error} className={className}>
      <Textarea
        id={id}
        name={field.name}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
        value={field.state.value as string}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

/** Radix Select reserves the empty string, so "nothing chosen" needs a stand-in. */
const NONE = '__none__'

/**
 * A select whose empty value is `''`. Pass `noneLabel` to let the user clear
 * it; without one the field always holds one of `options`.
 */
export function SelectField({
  field,
  label,
  options,
  noneLabel,
  placeholder,
  className,
}: {
  field: AnyFieldApi
  label: string
  options: SelectOption[]
  noneLabel?: string
  placeholder?: string
  className?: string
}) {
  const id = useId()
  const error = fieldError(field)
  const value = field.state.value as string

  return (
    <FieldShell id={id} label={label} error={error} className={className}>
      <Select
        name={field.name}
        value={value === '' ? (noneLabel ? NONE : '') : value}
        onValueChange={(next) => {
          field.handleChange(next === NONE ? '' : next)
          field.handleBlur()
        }}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error)}
        >
          <SelectValue placeholder={placeholder ?? noneLabel} />
        </SelectTrigger>
        <SelectContent>
          {noneLabel ? (
            <SelectItem value={NONE}>
              <span className="text-muted-foreground">{noneLabel}</span>
            </SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}
