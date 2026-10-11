import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { LoaderCircle, Plus, X } from 'lucide-react'
import { z } from 'zod'

import { ConfirmDelete } from '#/components/crm/confirm-delete.tsx'
import { TextField } from '#/components/crm/form-fields.tsx'
import { PageHeader } from '#/components/crm/page-header.tsx'
import { QueryError, errorMessage } from '#/components/crm/query-state.tsx'
import { Alert, AlertDescription } from '#/components/ui/alert.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { useWorkspaceMutation } from '#/hooks/use-workspace-mutation.ts'
import {
  createIndustry,
  createSource,
  deleteIndustry,
  deleteSource,
  deleteWorkspace,
  updateWorkspace,
} from '#/lib/crm-api.ts'
import {
  industriesQuery,
  sourcesQuery,
  workspaceKey,
  workspacesKey,
} from '#/lib/crm-queries.ts'
import { currencyCode, requiredText } from '#/lib/form-schemas.ts'
import { setActiveWorkspace, useActiveWorkspace } from '#/lib/workspace.ts'

import type { UseQueryResult } from '@tanstack/react-query'
import type { Workspace } from '#/lib/crm-api.ts'

export const Route = createFileRoute('/_shell/settings')({
  staticData: { title: 'Settings' },
  head: () => ({ meta: [{ title: 'Settings · open-crm' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const workspace = useActiveWorkspace()
  const industries = useQuery(industriesQuery(workspace.id))
  const sources = useQuery(sourcesQuery(workspace.id))

  const addIndustry = useWorkspaceMutation(createIndustry)
  const removeIndustry = useWorkspaceMutation(deleteIndustry)
  const addSource = useWorkspaceMutation(createSource)
  const removeSource = useWorkspaceMutation(deleteSource)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Workspace settings"
        description={`Settings for ${workspace.name}.`}
      />

      {/* Keyed so switching workspaces resets the form to the new values. */}
      <GeneralSettings key={workspace.id} workspace={workspace} />

      <LookupCard
        title="Industries"
        description="Tags for the markets your companies operate in."
        placeholder="e.g. SaaS"
        query={industries}
        onAdd={(name) => addIndustry.mutateAsync(name)}
        onRemove={(id) => removeIndustry.mutateAsync(id)}
      />

      <LookupCard
        title="Sources"
        description="How companies and contacts found you, e.g. referral or inbound."
        placeholder="e.g. Referral"
        query={sources}
        onAdd={(name) => addSource.mutateAsync(name)}
        onRemove={(id) => removeSource.mutateAsync(id)}
      />

      <DangerZone workspace={workspace} />
    </div>
  )
}

const generalSchema = z.object({
  name: requiredText('Name', 100),
  currency: currencyCode,
})

function GeneralSettings({ workspace }: { workspace: Workspace }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({})

  const form = useForm({
    defaultValues: { name: workspace.name, currency: workspace.currency },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: generalSchema },
    onSubmit: async ({ value }) => {
      setStatus({})
      try {
        const updated = await updateWorkspace(workspace.id, {
          name: value.name.trim(),
          currency: value.currency.trim().toUpperCase(),
        })
        queryClient.setQueryData<Workspace[]>(workspacesKey, (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)),
        )
        void queryClient.invalidateQueries({ queryKey: workspacesKey })
        setStatus({ saved: true })
      } catch (error: unknown) {
        setStatus({ error: errorMessage(error) })
      }
    },
  })

  return (
    <Card>
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Changing the currency relabels existing amounts; it does not convert
            them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status.error ? (
            <Alert variant="destructive">
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <form.Field name="name">
              {(field) => <TextField field={field} label="Name" />}
            </form.Field>
            <form.Field name="currency">
              {(field) => (
                <TextField field={field} label="Currency" maxLength={3} />
              )}
            </form.Field>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          {status.saved ? (
            <span className="text-muted-foreground text-sm" role="status">
              Saved
            </span>
          ) : null}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                Save
              </Button>
            )}
          </form.Subscribe>
        </CardFooter>
      </form>
    </Card>
  )
}

function LookupCard({
  title,
  description,
  placeholder,
  query,
  onAdd,
  onRemove,
}: {
  title: string
  description: string
  placeholder: string
  query: UseQueryResult<Array<{ id: string; name: string }>>
  onAdd: (name: string) => Promise<unknown>
  onRemove: (id: string) => Promise<unknown>
}) {
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [removingId, setRemovingId] = useState<string>()
  const [error, setError] = useState('')

  async function add() {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    setPending(true)
    setError('')
    try {
      await onAdd(trimmed)
      setName('')
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function remove(id: string) {
    setRemovingId(id)
    setError('')
    try {
      await onRemove(id)
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setRemovingId(undefined)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isError ? (
          <QueryError
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data ? (
          <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
        ) : query.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">None yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {query.data.map((item) => (
              <li key={item.id}>
                <Badge variant="secondary" className="gap-1 py-1 pr-1 pl-2.5">
                  {item.name}
                  <button
                    type="button"
                    className="hover:bg-background/80 rounded-sm p-0.5 disabled:opacity-50"
                    aria-label={`Remove ${item.name}`}
                    disabled={removingId === item.id}
                    onClick={() => void remove(item.id)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex max-w-sm gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void add()
          }}
        >
          <Input
            aria-label={`New ${title.toLowerCase()} name`}
            placeholder={placeholder}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={pending || !name.trim()}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            Add
          </Button>
        </form>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  )
}

function DangerZone({ workspace }: { workspace: Workspace }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    await deleteWorkspace(workspace.id)
    queryClient.setQueryData<Workspace[]>(workspacesKey, (current) =>
      current?.filter((item) => item.id !== workspace.id),
    )
    queryClient.removeQueries({ queryKey: workspaceKey(workspace.id) })
    // Falls back to the next workspace, or the create screen if none is left.
    setActiveWorkspace(null)
    void queryClient.invalidateQueries({ queryKey: workspacesKey })
    await navigate({ to: '/' })
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Delete workspace</CardTitle>
        <CardDescription>
          Removes {workspace.name} and everything in it from your account.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="destructive" onClick={() => setConfirming(true)}>
          Delete workspace
        </Button>
      </CardFooter>

      <ConfirmDelete
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${workspace.name}?`}
        description="All of its companies, contacts, and deals will no longer be accessible. This cannot be undone from the app."
        confirmLabel="Delete workspace"
        onConfirm={handleDelete}
      />
    </Card>
  )
}
