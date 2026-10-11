import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'

import { CompanyDialog } from '#/components/crm/company-dialog.tsx'
import { ConfirmDelete } from '#/components/crm/confirm-delete.tsx'
import { ContactDialog } from '#/components/crm/contact-dialog.tsx'
import { DealDialog } from '#/components/crm/deal-dialog.tsx'
import { PageHeader } from '#/components/crm/page-header.tsx'
import { QueryError, Spinner } from '#/components/crm/query-state.tsx'
import { StageBadge } from '#/components/crm/stage-badge.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { ApiError } from '#/lib/api.ts'
import { deleteCompany } from '#/lib/crm-api.ts'
import {
  PICKER_PAGE_SIZE,
  companyQuery,
  contactsQuery,
  dealsQuery,
  workspaceKey,
} from '#/lib/crm-queries.ts'
import {
  contactName,
  externalUrl,
  formatDate,
  formatMoney,
} from '#/lib/format.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { ReactNode } from 'react'
import type { Company, Contact, Deal } from '#/lib/crm-api.ts'

export const Route = createFileRoute('/_shell/companies/$companyId')({
  staticData: { title: 'Company' },
  head: () => ({ meta: [{ title: 'Company · open-crm' }] }),
  component: CompanyPage,
})

function CompanyPage() {
  const workspace = useActiveWorkspace()
  const { companyId } = Route.useParams()
  const company = useQuery(companyQuery(workspace.id, companyId))

  if (company.isError) {
    const notFound =
      company.error instanceof ApiError && company.error.status === 404

    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        {notFound ? (
          <p className="text-muted-foreground">
            This company does not exist or has been deleted.
          </p>
        ) : (
          <QueryError
            error={company.error}
            onRetry={() => void company.refetch()}
          />
        )}
      </div>
    )
  }

  if (!company.data) {
    return <Spinner />
  }

  return <CompanyDetail company={company.data} />
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 self-start" asChild>
      <Link to="/companies">
        <ArrowLeft />
        Companies
      </Link>
    </Button>
  )
}

function CompanyDetail({ company }: { company: Company }) {
  const workspace = useActiveWorkspace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const contacts = useQuery(
    contactsQuery(workspace.id, {
      companyId: company.id,
      pageSize: PICKER_PAGE_SIZE,
    }),
  )
  const deals = useQuery(
    dealsQuery(workspace.id, {
      companyId: company.id,
      pageSize: PICKER_PAGE_SIZE,
    }),
  )

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [contactEditor, setContactEditor] = useState<{
    open: boolean
    contact?: Contact
  }>({ open: false })
  const [dealEditor, setDealEditor] = useState<{ open: boolean; deal?: Deal }>({
    open: false,
  })

  async function handleDelete() {
    await deleteCompany(workspace.id, company.id)
    // Leave before invalidating: refetching this page's query would 404 and
    // flash the not-found state on the way out.
    await navigate({ to: '/companies' })
    void queryClient.invalidateQueries({ queryKey: workspaceKey(workspace.id) })
  }

  const openDealValue = (deals.data?.items ?? [])
    .filter((deal) => deal.stage !== 'won' && deal.stage !== 'lost')
    .reduce((sum, deal) => sum + deal.amount, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink />
        <PageHeader
          title={company.name}
          description={
            company.website ? (
              <a
                href={externalUrl(company.website)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                {company.website}
                <ExternalLink className="size-3" />
              </a>
            ) : undefined
          }
          actions={
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil />
                Edit
              </Button>
              <Button variant="outline" onClick={() => setDeleting(true)}>
                <Trash2 />
                Delete
              </Button>
            </>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Email">
                {company.email ? (
                  <a
                    href={`mailto:${company.email}`}
                    className="hover:underline"
                  >
                    {company.email}
                  </a>
                ) : null}
              </Detail>
              <Detail label="Phone">{company.phone}</Detail>
              <Detail label="LinkedIn">
                {company.linkedInUrl ? (
                  <a
                    href={externalUrl(company.linkedInUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all hover:underline"
                  >
                    {company.linkedInUrl}
                  </a>
                ) : null}
              </Detail>
              <Detail label="Address">
                {[company.address, company.postalCode, company.country]
                  .filter(Boolean)
                  .join(', ')}
              </Detail>
              <Detail label="Employees">
                {company.companySize?.toLocaleString()}
              </Detail>
              <Detail label="Annual revenue">
                {company.annualRevenue !== null
                  ? formatMoney(company.annualRevenue, workspace.currency)
                  : null}
              </Detail>
              <Detail label="Source">{company.source?.name}</Detail>
              <Detail label="Industries">
                {company.industries?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {company.industries.map((industry) => (
                      <Badge key={industry.id} variant="secondary">
                        {industry.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Deals</CardTitle>
              <CardDescription>
                {formatMoney(openDealValue, workspace.currency)} in open deals
              </CardDescription>
              <CardAction>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDealEditor({ open: true })}
                >
                  <Plus />
                  New deal
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {deals.isError ? (
                <QueryError error={deals.error} />
              ) : !deals.data ? (
                <Spinner className="py-4" />
              ) : deals.data.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No deals yet.</p>
              ) : (
                <ul className="divide-y">
                  {deals.data.items.map((deal) => (
                    <li key={deal.id}>
                      <button
                        type="button"
                        className="hover:bg-muted/50 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2.5 text-left"
                        onClick={() => setDealEditor({ open: true, deal })}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {deal.title}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Close {formatDate(deal.expectedCloseDate)}
                            {deal.contact
                              ? ` · ${contactName(deal.contact)}`
                              : ''}
                          </p>
                        </div>
                        <StageBadge stage={deal.stage} />
                        <span className="w-24 text-right text-sm tabular-nums">
                          {formatMoney(deal.amount, workspace.currency, {
                            compact: true,
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>People at {company.name}</CardDescription>
              <CardAction>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setContactEditor({ open: true })}
                >
                  <Plus />
                  Add contact
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {contacts.isError ? (
                <QueryError error={contacts.error} />
              ) : !contacts.data ? (
                <Spinner className="py-4" />
              ) : contacts.data.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No contacts yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {contacts.data.items.map((contact) => (
                    <li key={contact.id}>
                      <button
                        type="button"
                        className="hover:bg-muted/50 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2.5 text-left"
                        onClick={() =>
                          setContactEditor({ open: true, contact })
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {contactName(contact)}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {[contact.jobTitle, contact.email]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                        </div>
                        {contact.phone ? (
                          <span className="text-muted-foreground text-sm">
                            {contact.phone}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CompanyDialog
        open={editing}
        onOpenChange={setEditing}
        company={company}
      />

      <ContactDialog
        open={contactEditor.open}
        contact={contactEditor.contact}
        companyId={company.id}
        onOpenChange={(open) =>
          setContactEditor((current) => ({ ...current, open }))
        }
      />

      <DealDialog
        open={dealEditor.open}
        deal={dealEditor.deal}
        defaults={{ companyId: company.id }}
        onOpenChange={(open) =>
          setDealEditor((current) => ({ ...current, open }))
        }
      />

      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${company.name}?`}
        description="Its contacts and deals are kept, but no longer linked to a company."
        onConfirm={handleDelete}
      />
    </div>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  const empty =
    children === null ||
    children === undefined ||
    children === '' ||
    children === false

  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{empty ? '—' : children}</dd>
    </div>
  )
}
