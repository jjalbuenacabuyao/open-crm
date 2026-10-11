import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus, Users } from 'lucide-react'
import { z } from 'zod'

import { ConfirmDelete } from '#/components/crm/confirm-delete.tsx'
import { ContactDialog } from '#/components/crm/contact-dialog.tsx'
import { Pagination, SearchInput } from '#/components/crm/list-controls.tsx'
import { PageHeader } from '#/components/crm/page-header.tsx'
import {
  EmptyState,
  QueryError,
  Spinner,
} from '#/components/crm/query-state.tsx'
import { RowActions } from '#/components/crm/row-actions.tsx'
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
import { deleteContact } from '#/lib/crm-api.ts'
import { contactsQuery } from '#/lib/crm-queries.ts'
import { contactName, formatTimestamp } from '#/lib/format.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { Contact } from '#/lib/crm-api.ts'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/_shell/contacts/')({
  validateSearch: searchSchema,
  staticData: { title: 'Contacts' },
  head: () => ({ meta: [{ title: 'Contacts · open-crm' }] }),
  component: ContactsPage,
})

function ContactsPage() {
  const workspace = useActiveWorkspace()
  const { q = '', page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()

  const contacts = useQuery(contactsQuery(workspace.id, { q, page }))
  const remove = useWorkspaceMutation((workspaceId, id: string) =>
    deleteContact(workspaceId, id),
  )

  const [editor, setEditor] = useState<{ open: boolean; contact?: Contact }>({
    open: false,
  })
  const [deleting, setDeleting] = useState<Contact>()

  const setQuery = useCallback(
    (value: string) =>
      void navigate({
        search: (prev) => ({ ...prev, q: value || undefined, page: undefined }),
        replace: true,
      }),
    [navigate],
  )

  const data = contacts.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contacts"
        description="The people behind your companies and deals."
        actions={
          <Button onClick={() => setEditor({ open: true })}>
            <Plus />
            New contact
          </Button>
        }
      />

      <SearchInput
        value={q}
        onChange={setQuery}
        placeholder="Search by name, email, or job title"
      />

      {contacts.isError ? (
        <QueryError
          error={contacts.error}
          onRetry={() => void contacts.refetch()}
        />
      ) : !data ? (
        <Spinner />
      ) : data.total === 0 ? (
        q ? (
          <EmptyState
            icon={<Users />}
            title="No matching contacts"
            description={`Nothing matches “${q}”.`}
          />
        ) : (
          <EmptyState
            icon={<Users />}
            title="No contacts yet"
            description="Add the people you talk to."
            action={
              <Button size="sm" onClick={() => setEditor({ open: true })}>
                <Plus />
                New contact
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
                  <TableHead>Job title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium hover:underline"
                        onClick={() => setEditor({ open: true, contact })}
                      >
                        {contactName(contact)}
                      </button>
                      {contact.email ? (
                        <div className="text-muted-foreground text-xs">
                          {contact.email}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{contact.jobTitle || '—'}</TableCell>
                    <TableCell>
                      {contact.company ? (
                        <Link
                          to="/companies/$companyId"
                          params={{ companyId: contact.company.id }}
                          className="hover:underline"
                        >
                          {contact.company.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{contact.phone || '—'}</TableCell>
                    <TableCell>{contact.source?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimestamp(contact.createdAt)}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        label={`Actions for ${contactName(contact)}`}
                        onEdit={() => setEditor({ open: true, contact })}
                        onDelete={() => setDeleting(contact)}
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

      <ContactDialog
        open={editor.open}
        contact={editor.contact}
        onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
      />

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${deleting ? contactName(deleting) : 'contact'}?`}
        description="Deals with this contact are kept, but no longer linked to them."
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </div>
  )
}
