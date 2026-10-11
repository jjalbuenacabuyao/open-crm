import type { Contact, DealStage } from '#/lib/crm-api.ts'

export const STAGE_LABELS: { [stage in DealStage]: string } = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export function formatMoney(
  amount: number,
  currency: string,
  options: { compact?: boolean } = {},
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: options.compact ? 'compact' : 'standard',
      maximumFractionDigits: options.compact ? 1 : 2,
    }).format(amount)
  } catch {
    // An unknown currency code throws; show the number rather than nothing.
    return `${amount.toLocaleString()} ${currency}`
  }
}

/**
 * Formats a date-only value. The API sends those as midnight UTC, so they are
 * formatted in UTC — in local time they would show the previous day for
 * anyone west of Greenwich.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** A timestamp, such as createdAt, in the viewer's time zone. */
export function formatTimestamp(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** `2026-10-01T00:00:00Z` → `2026-10-01`, the value an `<input type="date">` takes. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

export function contactName(contact: Pick<Contact, 'firstName' | 'lastName'>) {
  return `${contact.firstName} ${contact.lastName}`.trim()
}

/** Adds a scheme so a bare `acme.com` links out instead of resolving relatively. */
export function externalUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}
