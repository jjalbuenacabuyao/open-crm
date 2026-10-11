import { z } from 'zod'

/**
 * Zod pieces shared by the CRM forms. Form state holds every input as a
 * string, including numbers and optional IDs (`''` for none); the conversion
 * to the API's types happens once, on submit, via the helpers below.
 */

export const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`)

export const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters.`)

export const optionalEmail = z
  .string()
  .trim()
  .max(320, 'Email must be at most 320 characters.')
  .refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'Enter a valid email address.',
  )

export const optionalAmount = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0),
    'Enter a positive number.',
  )

export const optionalWholeNumber = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d+$/.test(value),
    'Enter a whole number.',
  )

/** `''` → null, anything else → a number. Only call on validated input. */
export function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : Number(trimmed)
}

export function toIdOrNull(value: string): string | null {
  return value === '' ? null : value
}

export const currencyCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Enter a three-letter currency code.')
