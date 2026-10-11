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
import { DEAL_STAGES, createDeal, updateDeal } from '#/lib/crm-api.ts'
import {
  PICKER_PAGE_SIZE,
  companiesQuery,
  contactsQuery,
} from '#/lib/crm-queries.ts'
import { STAGE_LABELS, contactName, toDateInput } from '#/lib/format.ts'
import {
  optionalAmount,
  optionalText,
  requiredText,
  toIdOrNull,
} from '#/lib/form-schemas.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { Deal, DealInput, DealStage } from '#/lib/crm-api.ts'

const schema = z.object({
  title: requiredText('Title', 200),
  amount: optionalAmount,
  stage: z.enum(DEAL_STAGES),
  expectedCloseDate: z
    .string()
    .refine(
      (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
      'Enter a valid date.',
    ),
  notes: optionalText('Notes', 10000),
  companyId: z.string(),
  contactId: z.string(),
})

/**
 * Creates a deal, or edits `deal` when one is given. `defaults` preselects
 * fields for a new deal, such as the stage column or company it was added from.
 */
export function DealDialog({
  open,
  onOpenChange,
  deal,
  defaults,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal?: Deal
  defaults?: { stage?: DealStage; companyId?: string; contactId?: string }
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={deal ? 'Edit deal' : 'New deal'}
      description={
        deal ? undefined : 'Track an opportunity through the pipeline.'
      }
    >
      <DealForm
        key={deal?.id ?? 'new'}
        deal={deal}
        defaults={defaults}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  )
}

function DealForm({
  deal,
  defaults,
  onDone,
}: {
  deal?: Deal
  defaults?: { stage?: DealStage; companyId?: string; contactId?: string }
  onDone: () => void
}) {
  const workspace = useActiveWorkspace()
  const companies = useQuery(
    companiesQuery(workspace.id, { pageSize: PICKER_PAGE_SIZE }),
  )
  const contacts = useQuery(
    contactsQuery(workspace.id, { pageSize: PICKER_PAGE_SIZE }),
  )
  const [serverError, setServerError] = useState('')

  const save = useWorkspaceMutation((workspaceId, input: DealInput) =>
    deal
      ? updateDeal(workspaceId, deal.id, input)
      : createDeal(workspaceId, input),
  )

  const form = useForm({
    defaultValues: {
      title: deal?.title ?? '',
      amount: deal ? String(deal.amount) : '',
      stage: deal?.stage ?? defaults?.stage ?? 'lead',
      expectedCloseDate: toDateInput(deal?.expectedCloseDate),
      notes: deal?.notes ?? '',
      companyId: deal?.companyId ?? defaults?.companyId ?? '',
      contactId: deal?.contactId ?? defaults?.contactId ?? '',
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: async ({ value }) => {
      setServerError('')
      try {
        await save.mutateAsync({
          title: value.title.trim(),
          amount: value.amount.trim() === '' ? 0 : Number(value.amount),
          stage: value.stage,
          expectedCloseDate: value.expectedCloseDate || null,
          notes: value.notes.trim(),
          companyId: toIdOrNull(value.companyId),
          contactId: toIdOrNull(value.contactId),
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
          submitLabel={deal ? 'Save changes' : 'Create deal'}
          onCancel={onDone}
        >
          <form.Field name="title">
            {(field) => (
              <TextField field={field} label="Title" autoComplete="off" />
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="amount">
              {(field) => (
                <TextField
                  field={field}
                  label={`Amount (${workspace.currency})`}
                  inputMode="decimal"
                  placeholder="0"
                />
              )}
            </form.Field>
            <form.Field name="stage">
              {(field) => (
                <SelectField
                  field={field}
                  label="Stage"
                  options={DEAL_STAGES.map((stage) => ({
                    value: stage,
                    label: STAGE_LABELS[stage],
                  }))}
                />
              )}
            </form.Field>
            <form.Field name="expectedCloseDate">
              {(field) => (
                <TextField
                  field={field}
                  label="Expected close date"
                  type="date"
                />
              )}
            </form.Field>
          </div>

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
            <form.Field name="contactId">
              {(field) => (
                <SelectField
                  field={field}
                  label="Contact"
                  noneLabel="No contact"
                  options={(contacts.data?.items ?? []).map((contact) => ({
                    value: contact.id,
                    label: contact.company
                      ? `${contactName(contact)} · ${contact.company.name}`
                      : contactName(contact),
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
