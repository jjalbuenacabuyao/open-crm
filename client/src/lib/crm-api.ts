import { apiFetch } from '#/lib/api.ts'

/**
 * Types and calls for the workspace-scoped CRM endpoints. The interfaces
 * mirror the Go domain models as the API serializes them.
 */

interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
  createdById: string
}

export interface Workspace extends BaseRecord {
  name: string
  /** ISO 4217 code every deal amount in the workspace is in. */
  currency: string
}

export interface Industry extends BaseRecord {
  name: string
  workspaceId: string
}

export interface Source extends BaseRecord {
  name: string
  workspaceId: string
}

export interface Company extends BaseRecord {
  name: string
  email: string
  phone: string
  website: string
  linkedInUrl: string
  address: string
  postalCode: string
  country: string
  companySize: number | null
  annualRevenue: number | null
  sourceId: string | null
  source?: Source
  /** Omitted by the API when the company has none. */
  industries?: Industry[]
  workspaceId: string
}

export interface Contact extends BaseRecord {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  notes: string
  companyId: string | null
  company?: Company
  sourceId: string | null
  source?: Source
  workspaceId: string
}

export const DEAL_STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const

export type DealStage = (typeof DEAL_STAGES)[number]

export interface Deal extends BaseRecord {
  title: string
  amount: number
  stage: DealStage
  /** Midnight UTC on the expected date, e.g. `2026-10-01T00:00:00Z`. */
  expectedCloseDate: string | null
  closedAt: string | null
  notes: string
  companyId: string | null
  company?: Company
  contactId: string | null
  contact?: Contact
  workspaceId: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface StageSummary {
  stage: DealStage
  count: number
  amount: number
}

export interface WorkspaceStats {
  companies: number
  contacts: number
  openDeals: number
  openPipeline: number
  wonAmount: number
  /** Won / (won + lost); null until a deal has closed. */
  winRate: number | null
  stages: StageSummary[]
}

export interface ListParams {
  q?: string
  page?: number
  pageSize?: number
}

export interface ContactListParams extends ListParams {
  companyId?: string
}

export interface DealListParams extends ListParams {
  stage?: DealStage
  companyId?: string
  contactId?: string
}

export interface WorkspaceInput {
  name: string
  currency: string
}

export interface CompanyInput {
  name: string
  email: string
  phone: string
  website: string
  linkedInUrl: string
  address: string
  postalCode: string
  country: string
  companySize: number | null
  annualRevenue: number | null
  sourceId: string | null
  industryIds: string[]
}

export interface ContactInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  notes: string
  companyId: string | null
  sourceId: string | null
}

export interface DealInput {
  title: string
  amount: number
  stage: DealStage
  /** YYYY-MM-DD, or null. */
  expectedCloseDate: string | null
  notes: string
  companyId: string | null
  contactId: string | null
}

function withQuery(
  path: string,
  params: { [key: string]: string | number | undefined },
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const ws = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}`

// Workspaces

export const listWorkspaces = () => apiFetch<Workspace[]>('/workspaces')

export const createWorkspace = (input: WorkspaceInput) =>
  send<Workspace>('POST', '/workspaces', input)

export const updateWorkspace = (workspaceId: string, input: WorkspaceInput) =>
  send<Workspace>('PUT', ws(workspaceId), input)

export const deleteWorkspace = (workspaceId: string) =>
  send<void>('DELETE', ws(workspaceId))

export const getWorkspaceStats = (workspaceId: string) =>
  apiFetch<WorkspaceStats>(`${ws(workspaceId)}/stats`)

// Companies

export const listCompanies = (workspaceId: string, params: ListParams = {}) =>
  apiFetch<Page<Company>>(
    withQuery(`${ws(workspaceId)}/companies`, { ...params }),
  )

export const getCompany = (workspaceId: string, id: string) =>
  apiFetch<Company>(`${ws(workspaceId)}/companies/${id}`)

export const createCompany = (workspaceId: string, input: CompanyInput) =>
  send<Company>('POST', `${ws(workspaceId)}/companies`, input)

export const updateCompany = (
  workspaceId: string,
  id: string,
  input: CompanyInput,
) => send<Company>('PUT', `${ws(workspaceId)}/companies/${id}`, input)

export const deleteCompany = (workspaceId: string, id: string) =>
  send<void>('DELETE', `${ws(workspaceId)}/companies/${id}`)

// Contacts

export const listContacts = (
  workspaceId: string,
  params: ContactListParams = {},
) =>
  apiFetch<Page<Contact>>(
    withQuery(`${ws(workspaceId)}/contacts`, { ...params }),
  )

export const createContact = (workspaceId: string, input: ContactInput) =>
  send<Contact>('POST', `${ws(workspaceId)}/contacts`, input)

export const updateContact = (
  workspaceId: string,
  id: string,
  input: ContactInput,
) => send<Contact>('PUT', `${ws(workspaceId)}/contacts/${id}`, input)

export const deleteContact = (workspaceId: string, id: string) =>
  send<void>('DELETE', `${ws(workspaceId)}/contacts/${id}`)

// Deals

export const listDeals = (workspaceId: string, params: DealListParams = {}) =>
  apiFetch<Page<Deal>>(withQuery(`${ws(workspaceId)}/deals`, { ...params }))

export const createDeal = (workspaceId: string, input: DealInput) =>
  send<Deal>('POST', `${ws(workspaceId)}/deals`, input)

export const updateDeal = (workspaceId: string, id: string, input: DealInput) =>
  send<Deal>('PUT', `${ws(workspaceId)}/deals/${id}`, input)

export const updateDealStage = (
  workspaceId: string,
  id: string,
  stage: DealStage,
) => send<Deal>('PUT', `${ws(workspaceId)}/deals/${id}/stage`, { stage })

export const deleteDeal = (workspaceId: string, id: string) =>
  send<void>('DELETE', `${ws(workspaceId)}/deals/${id}`)

// Lookups

export const listIndustries = (workspaceId: string) =>
  apiFetch<Industry[]>(`${ws(workspaceId)}/industries`)

export const createIndustry = (workspaceId: string, name: string) =>
  send<Industry>('POST', `${ws(workspaceId)}/industries`, { name })

export const deleteIndustry = (workspaceId: string, id: string) =>
  send<void>('DELETE', `${ws(workspaceId)}/industries/${id}`)

export const listSources = (workspaceId: string) =>
  apiFetch<Source[]>(`${ws(workspaceId)}/sources`)

export const createSource = (workspaceId: string, name: string) =>
  send<Source>('POST', `${ws(workspaceId)}/sources`, { name })

export const deleteSource = (workspaceId: string, id: string) =>
  send<void>('DELETE', `${ws(workspaceId)}/sources/${id}`)
