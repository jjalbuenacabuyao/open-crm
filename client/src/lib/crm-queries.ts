import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  getCompany,
  getWorkspaceStats,
  listCompanies,
  listContacts,
  listDeals,
  listIndustries,
  listSources,
  listWorkspaces,
} from '#/lib/crm-api.ts'

import type {
  ContactListParams,
  DealListParams,
  ListParams,
} from '#/lib/crm-api.ts'

/**
 * Query options for the CRM API.
 *
 * Every key under a workspace starts with `workspaceKey(id)`, so a mutation
 * can invalidate that one prefix and refresh everything it might have touched
 * — lists, detail pages, lookups, and the dashboard stats — without tracking
 * which views display what.
 */

export const workspacesKey = ['workspaces'] as const

export const workspaceKey = (workspaceId: string) =>
  ['workspace', workspaceId] as const

export const workspacesQuery = () =>
  queryOptions({ queryKey: workspacesKey, queryFn: listWorkspaces })

export const statsQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: [...workspaceKey(workspaceId), 'stats'],
    queryFn: () => getWorkspaceStats(workspaceId),
  })

export const companiesQuery = (workspaceId: string, params: ListParams = {}) =>
  queryOptions({
    queryKey: [...workspaceKey(workspaceId), 'companies', params],
    queryFn: () => listCompanies(workspaceId, params),
    placeholderData: keepPreviousData,
  })

export const companyQuery = (workspaceId: string, id: string) =>
  queryOptions({
    queryKey: [...workspaceKey(workspaceId), 'company', id],
    queryFn: () => getCompany(workspaceId, id),
  })

export const contactsQuery = (
  workspaceId: string,
  params: ContactListParams = {},
) =>
  queryOptions({
    queryKey: [...workspaceKey(workspaceId), 'contacts', params],
    queryFn: () => listContacts(workspaceId, params),
    placeholderData: keepPreviousData,
  })

export const dealsQuery = (workspaceId: string, params: DealListParams = {}) =>
  queryOptions({
    queryKey: [...workspaceKey(workspaceId), 'deals', params],
    queryFn: () => listDeals(workspaceId, params),
    placeholderData: keepPreviousData,
  })

export const industriesQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: [...workspaceKey(workspaceId), 'industries'],
    queryFn: () => listIndustries(workspaceId),
  })

export const sourcesQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: [...workspaceKey(workspaceId), 'sources'],
    queryFn: () => listSources(workspaceId),
  })

/**
 * The page size used where a form needs every option at once, such as the
 * company picker. It is the API's maximum; a workspace larger than this sees
 * the most recent records only.
 */
export const PICKER_PAGE_SIZE = 200
