import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { z } from 'zod'

import { DialogForm, FormDialog } from '#/components/crm/form-dialog.tsx'
import {
  SelectField,
  TextField,
  TextareaField,
} from '#/components/crm/form-fields.tsx'
import { errorMessage } from '#/components/crm/query-state.tsx'
import { useWorkspaceMutation } from '#/hooks/use-workspace-mutation.ts'
import { createContact, updateContact } from '#/lib/crm-api.ts'
import {
  PICKER_PAGE_SIZE,
  companiesQuery,
  sourcesQuery,
} from '#/lib/crm-queries.ts'
import {
  optionalEmail,
  optionalText,
  requiredText,
  toIdOrNull,
} from '#/lib/form-schemas.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { Contact, ContactInput } from '#/lib/crm-api.ts'

const schema = z.object({
  firstName: requiredText('First name', 100),
  lastName: optionalText('Last name', 100),
  email: optionalEmail,
  phone: optionalText('Phone', 50),
  jobTitle: optionalText('Job title', 200),
  notes: optionalText('Notes', 10000),
  companyId: z.string(),
  sourceId: z.string(),
})

/**
 * Creates a contact, or edits `contact` when one is given. `companyId`
 * preselects the company for a new contact, as the company page does.
 */
export function ContactDialog({
  open,
  onOpenChange,
  contact,
  companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact
  companyId?: string
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={contact ? 'Edit contact' : 'New contact'}
      description={contact ? undefined : 'Add a person you work with.'}
    >
      <ContactForm
        key={contact?.id ?? 'new'}
        contact={contact}
        companyId={companyId}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  )
}

function ContactForm({
  contact,
  companyId,
  onDone,
}: {
  contact?: Contact
  companyId?: string
  onDone: () => void
}) {
  const workspace = useActiveWorkspace()
  const companies = useQuery(
    companiesQuery(workspace.id, { pageSize: PICKER_PAGE_SIZE }),
  )
  const sources = useQuery(sourcesQuery(workspace.id))
  const [serverError, setServerError] = useState('')

  const save = useWorkspaceMutation((workspaceId, input: ContactInput) =>
    contact
      ? updateContact(workspaceId, contact.id, input)
      : createContact(workspaceId, input),
  )

  const form = useForm({
    defaultValues: {
      firstName: contact?.firstName ?? '',
      lastName: contact?.lastName ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      jobTitle: contact?.jobTitle ?? '',
      notes: contact?.notes ?? '',
      companyId: contact?.companyId ?? companyId ?? '',
      sourceId: contact?.sourceId ?? '',
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: async ({ value }) => {
      setServerError('')
      try {
        await save.mutateAsync({
          firstName: value.firstName.trim(),
          lastName: value.lastName.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          jobTitle: value.jobTitle.trim(),
          notes: value.notes.trim(),
          companyId: toIdOrNull(value.companyId),
          sourceId: toIdOrNull(value.sourceId),
        })
        onDone()
      } catch (error: unknown) {
        setServerError(errorMessage(error))
      }
    },
  })

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <DialogForm
          onSubmit={() => void form.handleSubmit()}
          error={serverError}
          isSubmitting={isSubmitting}
          submitLabel={contact ? 'Save changes' : 'Create contact'}
          onCancel={onDone}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="firstName">
              {(field) => (
                <TextField
                  field={field}
                  label="First name"
                  autoComplete="off"
                />
              )}
            </form.Field>
            <form.Field name="lastName">
              {(field) => (
                <TextField field={field} label="Last name" autoComplete="off" />
              )}
            </form.Field>
            <form.Field name="email">
              {(field) => (
                <TextField field={field} label="Email" type="email" />
              )}
            </form.Field>
            <form.Field name="phone">
              {(field) => <TextField field={field} label="Phone" type="tel" />}
            </form.Field>
          </div>

          <form.Field name="jobTitle">
            {(field) => <TextField field={field} label="Job title" />}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="companyId">
              {(field) => (
                <SelectField
                  field={field}
                  label="Company"
                  noneLabel="No company"
                  options={(companies.data?.items ?? []).map((company) => ({
                    value: company.id,
                    label: company.name,
                  }))}
                />
              )}
            </form.Field>
            <form.Field name="sourceId">
              {(field) => (
                <SelectField
                  field={field}
                  label="Source"
                  noneLabel="No source"
                  options={(sources.data ?? []).map((source) => ({
                    value: source.id,
                    label: source.name,
                  }))}
                />
              )}
            </form.Field>
          </div>

          <form.Field name="notes">
            {(field) => <TextareaField field={field} label="Notes" />}
          </form.Field>
        </DialogForm>
      )}
    </form.Subscribe>
  )
}
