import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Building2, Plus } from 'lucide-react'
import { z } from 'zod'

import { CompanyDialog } from '#/components/crm/company-dialog.tsx'
import { ConfirmDelete } from '#/components/crm/confirm-delete.tsx'
import { Pagination, SearchInput } from '#/components/crm/list-controls.tsx'
import { PageHeader } from '#/components/crm/page-header.tsx'
import {
  EmptyState,
  QueryError,
  Spinner,
} from '#/components/crm/query-state.tsx'
import { RowActions } from '#/components/crm/row-actions.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { useWorkspaceMutation } from '#/hooks/use-workspace-mutation.ts'
import { deleteCompany } from '#/lib/crm-api.ts'
import { companiesQuery } from '#/lib/crm-queries.ts'
import { formatTimestamp } from '#/lib/format.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { Company } from '#/lib/crm-api.ts'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/_shell/companies/')({
  validateSearch: searchSchema,
  staticData: { title: 'Companies' },
  head: () => ({ meta: [{ title: 'Companies · open-crm' }] }),
  component: CompaniesPage,
})

function CompaniesPage() {
  const workspace = useActiveWorkspace()
  const { q = '', page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()

  const companies = useQuery(companiesQuery(workspace.id, { q, page }))
  const remove = useWorkspaceMutation((workspaceId, id: string) =>
    deleteCompany(workspaceId, id),
  )

  const [editor, setEditor] = useState<{ open: boolean; company?: Company }>({
    open: false,
  })
  const [deleting, setDeleting] = useState<Company>()

  const setQuery = useCallback(
    (value: string) =>
      void navigate({
        search: (prev) => ({ ...prev, q: value || undefined, page: undefined }),
        replace: true,
      }),
    [navigate],
  )

  const data = companies.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Companies"
        description="Organizations you sell to, partner with, or track."
        actions={
          <Button onClick={() => setEditor({ open: true })}>
            <Plus />
            New company
          </Button>
        }
      />

      <SearchInput
        value={q}
        onChange={setQuery}
        placeholder="Search by name, email, or website"
      />

      {companies.isError ? (
        <QueryError
          error={companies.error}
          onRetry={() => void companies.refetch()}
        />
      ) : !data ? (
        <Spinner />
      ) : data.total === 0 ? (
        q ? (
          <EmptyState
            icon={<Building2 />}
            title="No matching companies"
            description={`Nothing matches “${q}”.`}
          />
        ) : (
          <EmptyState
            icon={<Building2 />}
            title="No companies yet"
            description="Add the first organization you're working with."
            action={
              <Button size="sm" onClick={() => setEditor({ open: true })}>
                <Plus />
                New company
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industries</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Link
                        to="/companies/$companyId"
                        params={{ companyId: company.id }}
                        className="font-medium hover:underline"
                      >
                        {company.name}
                      </Link>
                      {company.website ? (
                        <div className="text-muted-foreground text-xs">
                          {company.website}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <IndustryBadges company={company} />
                    </TableCell>
                    <TableCell>{company.country || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {company.companySize?.toLocaleString() ?? '—'}
                    </TableCell>
                    <TableCell>{company.source?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimestamp(company.createdAt)}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        label={`Actions for ${company.name}`}
                        onEdit={() => setEditor({ open: true, company })}
                        onDelete={() => setDeleting(company)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(next) =>
              void navigate({ search: (prev) => ({ ...prev, page: next }) })
            }
          />
        </>
      )}

      <CompanyDialog
        open={editor.open}
        company={editor.company}
        onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
      />

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? 'company'}?`}
        description="Its contacts and deals are kept, but no longer linked to a company."
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </div>
  )
}

function IndustryBadges({ company }: { company: Company }) {
  const industries = company.industries ?? []
  if (industries.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  const shown = industries.slice(0, 2)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((industry) => (
        <Badge key={industry.id} variant="secondary">
          {industry.name}
        </Badge>
      ))}
      {industries.length > shown.length ? (
        <Badge variant="outline">+{industries.length - shown.length}</Badge>
      ) : null}
    </div>
  )
}
