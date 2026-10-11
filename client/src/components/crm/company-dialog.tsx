import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { z } from 'zod'

import { DialogForm, FormDialog } from '#/components/crm/form-dialog.tsx'
import { SelectField, TextField } from '#/components/crm/form-fields.tsx'
import { errorMessage } from '#/components/crm/query-state.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import { Label } from '#/components/ui/label.tsx'
import { useWorkspaceMutation } from '#/hooks/use-workspace-mutation.ts'
import { createCompany, updateCompany } from '#/lib/crm-api.ts'
import { industriesQuery, sourcesQuery } from '#/lib/crm-queries.ts'
import {
  optionalAmount,
  optionalEmail,
  optionalText,
  optionalWholeNumber,
  requiredText,
  toIdOrNull,
  toNumberOrNull,
} from '#/lib/form-schemas.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { Company, CompanyInput } from '#/lib/crm-api.ts'

const schema = z.object({
  name: requiredText('Name', 200),
  email: optionalEmail,
  phone: optionalText('Phone', 50),
  website: optionalText('Website', 500),
  linkedInUrl: optionalText('LinkedIn URL', 500),
  address: optionalText('Address', 500),
  postalCode: optionalText('Postal code', 20),
  country: optionalText('Country', 100),
  companySize: optionalWholeNumber,
  annualRevenue: optionalAmount,
  sourceId: z.string(),
  industryIds: z.array(z.string()),
})

/** Creates a company, or edits `company` when one is given. */
export function CompanyDialog({
  open,
  onOpenChange,
  company,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  company?: Company
  onSaved?: (company: Company) => void
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={company ? 'Edit company' : 'New company'}
      description={
        company ? undefined : 'Add an organization you do business with.'
      }
    >
      <CompanyForm
        key={company?.id ?? 'new'}
        company={company}
        onCancel={() => onOpenChange(false)}
        onSaved={(saved) => {
          onOpenChange(false)
          onSaved?.(saved)
        }}
      />
    </FormDialog>
  )
}

function CompanyForm({
  company,
  onCancel,
  onSaved,
}: {
  company?: Company
  onCancel: () => void
  onSaved: (company: Company) => void
}) {
  const workspace = useActiveWorkspace()
  const industries = useQuery(industriesQuery(workspace.id))
  const sources = useQuery(sourcesQuery(workspace.id))
  const [serverError, setServerError] = useState('')

  const save = useWorkspaceMutation((workspaceId, input: CompanyInput) =>
    company
      ? updateCompany(workspaceId, company.id, input)
      : createCompany(workspaceId, input),
  )

  const form = useForm({
    defaultValues: {
      name: company?.name ?? '',
      email: company?.email ?? '',
      phone: company?.phone ?? '',
      website: company?.website ?? '',
      linkedInUrl: company?.linkedInUrl ?? '',
      address: company?.address ?? '',
      postalCode: company?.postalCode ?? '',
      country: company?.country ?? '',
      companySize: company?.companySize?.toString() ?? '',
      annualRevenue: company?.annualRevenue?.toString() ?? '',
      sourceId: company?.sourceId ?? '',
      industryIds: company?.industries?.map((industry) => industry.id) ?? [],
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: async ({ value }) => {
      setServerError('')
      try {
        const saved = await save.mutateAsync({
          name: value.name.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          website: value.website.trim(),
          linkedInUrl: value.linkedInUrl.trim(),
          address: value.address.trim(),
          postalCode: value.postalCode.trim(),
          country: value.country.trim(),
          companySize: toNumberOrNull(value.companySize),
          annualRevenue: toNumberOrNull(value.annualRevenue),
          sourceId: toIdOrNull(value.sourceId),
          industryIds: value.industryIds,
        })
        onSaved(saved)
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
          submitLabel={company ? 'Save changes' : 'Create company'}
          onCancel={onCancel}
        >
          <form.Field name="name">
            {(field) => (
              <TextField field={field} label="Name" autoComplete="off" />
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="email">
              {(field) => (
                <TextField field={field} label="Email" type="email" />
              )}
            </form.Field>
            <form.Field name="phone">
              {(field) => <TextField field={field} label="Phone" type="tel" />}
            </form.Field>
            <form.Field name="website">
              {(field) => (
                <TextField
                  field={field}
                  label="Website"
                  placeholder="acme.com"
                />
              )}
            </form.Field>
            <form.Field name="linkedInUrl">
              {(field) => <TextField field={field} label="LinkedIn URL" />}
            </form.Field>
          </div>

          <form.Field name="address">
            {(field) => <TextField field={field} label="Address" />}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="postalCode">
              {(field) => <TextField field={field} label="Postal code" />}
            </form.Field>
            <form.Field name="country">
              {(field) => <TextField field={field} label="Country" />}
            </form.Field>
            <form.Field name="companySize">
              {(field) => (
                <TextField
                  field={field}
                  label="Employees"
                  inputMode="numeric"
                />
              )}
            </form.Field>
            <form.Field name="annualRevenue">
              {(field) => (
                <TextField
                  field={field}
                  label={`Annual revenue (${workspace.currency})`}
                  inputMode="decimal"
                />
              )}
            </form.Field>
          </div>

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

          <form.Field name="industryIds">
            {(field) => {
              const selected = field.state.value
              const options = industries.data ?? []

              return (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm leading-none font-medium">
                    Industries
                  </legend>
                  {options.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No industries yet. Add them in workspace settings.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {options.map((industry) => {
                        const id = `industry-${industry.id}`
                        return (
                          <div
                            key={industry.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={id}
                              checked={selected.includes(industry.id)}
                              onCheckedChange={(checked) =>
                                field.handleChange(
                                  checked === true
                                    ? [...selected, industry.id]
                                    : selected.filter(
                                        (value) => value !== industry.id,
                                      ),
                                )
                              }
                            />
                            <Label htmlFor={id} className="font-normal">
                              {industry.name}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </fieldset>
              )
            }}
          </form.Field>
        </DialogForm>
      )}
    </form.Subscribe>
  )
}
