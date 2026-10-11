import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { LoaderCircle } from 'lucide-react'
import { z } from 'zod'

import { TextField } from '#/components/crm/form-fields.tsx'
import { errorMessage } from '#/components/crm/query-state.tsx'
import { Alert, AlertDescription } from '#/components/ui/alert.tsx'
import { Button } from '#/components/ui/button.tsx'
import { createWorkspace } from '#/lib/crm-api.ts'
import { workspacesKey } from '#/lib/crm-queries.ts'
import { currencyCode, requiredText } from '#/lib/form-schemas.ts'
import { setActiveWorkspace } from '#/lib/workspace.ts'

import type { Workspace } from '#/lib/crm-api.ts'

const schema = z.object({
  name: requiredText('Name', 100),
  currency: currencyCode,
})

/** Creates a workspace and switches to it. */
export function CreateWorkspaceForm({
  onCreated,
}: {
  onCreated?: (workspace: Workspace) => void
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState('')

  const form = useForm({
    defaultValues: { name: '', currency: 'USD' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: async ({ value }) => {
      setServerError('')
      try {
        const workspace = await createWorkspace({
          name: value.name.trim(),
          currency: value.currency.trim().toUpperCase(),
        })
        // Added to the cache before selecting it: otherwise the selection
        // points at an ID the list does not have yet, and the fallback briefly
        // shows the first workspace instead.
        queryClient.setQueryData<Workspace[]>(workspacesKey, (current) => [
          ...(current ?? []),
          workspace,
        ])
        setActiveWorkspace(workspace.id)
        void queryClient.invalidateQueries({ queryKey: workspacesKey })
        onCreated?.(workspace)
      } catch (error: unknown) {
        setServerError(errorMessage(error))
      }
    },
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <form.Field name="name">
        {(field) => (
          <TextField
            field={field}
            label="Workspace name"
            placeholder="Acme Sales"
            autoComplete="off"
            autoFocus
          />
        )}
      </form.Field>

      <form.Field name="currency">
        {(field) => (
          <TextField
            field={field}
            label="Currency"
            description="The ISO code deal amounts are in, e.g. USD, EUR, PHP."
            maxLength={3}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
            Create workspace
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
