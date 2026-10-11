import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowRightLeft, CalendarDays, Plus } from 'lucide-react'
import { z } from 'zod'

import { ConfirmDelete } from '#/components/crm/confirm-delete.tsx'
import { DealDialog } from '#/components/crm/deal-dialog.tsx'
import { SearchInput } from '#/components/crm/list-controls.tsx'
import { PageHeader } from '#/components/crm/page-header.tsx'
import { QueryError, Spinner } from '#/components/crm/query-state.tsx'
import { RowActions } from '#/components/crm/row-actions.tsx'
import { Alert, AlertDescription } from '#/components/ui/alert.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import { useWorkspaceMutation } from '#/hooks/use-workspace-mutation.ts'
import { DEAL_STAGES, deleteDeal, updateDealStage } from '#/lib/crm-api.ts'
import { PICKER_PAGE_SIZE, dealsQuery } from '#/lib/crm-queries.ts'
import {
  STAGE_LABELS,
  contactName,
  formatDate,
  formatMoney,
} from '#/lib/format.ts'
import { cn } from '#/lib/utils.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { Deal, DealStage } from '#/lib/crm-api.ts'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_shell/deals/')({
  validateSearch: searchSchema,
  staticData: { title: 'Pipeline' },
  head: () => ({ meta: [{ title: 'Pipeline · open-crm' }] }),
  component: DealsPage,
})

function DealsPage() {
  const workspace = useActiveWorkspace()
  const { q = '' } = Route.useSearch()
  const navigate = Route.useNavigate()

  // The board shows every deal at once rather than paging per column.
  const deals = useQuery(
    dealsQuery(workspace.id, { q, pageSize: PICKER_PAGE_SIZE }),
  )
  const move = useWorkspaceMutation(
    (workspaceId, { id, stage }: { id: string; stage: DealStage }) =>
      updateDealStage(workspaceId, id, stage),
  )
  const remove = useWorkspaceMutation((workspaceId, id: string) =>
    deleteDeal(workspaceId, id),
  )

  const [editor, setEditor] = useState<{
    open: boolean
    deal?: Deal
    stage?: DealStage
  }>({ open: false })
  const [deleting, setDeleting] = useState<Deal>()

  const setQuery = useCallback(
    (value: string) =>
      void navigate({ search: { q: value || undefined }, replace: true }),
    [navigate],
  )

  const byStage = new Map<DealStage, Deal[]>(
    DEAL_STAGES.map((stage) => [stage, []]),
  )
  for (const deal of deals.data?.items ?? []) {
    byStage.get(deal.stage)?.push(deal)
  }

  const movingId = move.isPending ? move.variables.id : undefined

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Pipeline"
        description="Every deal, by stage. Use a card's menu to move it along."
        actions={
          <Button onClick={() => setEditor({ open: true })}>
            <Plus />
            New deal
          </Button>
        }
      />

      <SearchInput value={q} onChange={setQuery} placeholder="Search deals" />

      {move.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Could not move the deal: {move.error.message}
          </AlertDescription>
        </Alert>
      ) : null}

      {deals.data && deals.data.total > deals.data.items.length ? (
        <Alert>
          <AlertDescription>
            Showing the {deals.data.items.length} most recently updated of{' '}
            {deals.data.total} deals. Search to narrow the board.
          </AlertDescription>
        </Alert>
      ) : null}

      {deals.isError ? (
        <QueryError error={deals.error} onRetry={() => void deals.refetch()} />
      ) : !deals.data ? (
        <Spinner />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-4">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = byStage.get(stage) ?? []
              const total = stageDeals.reduce(
                (sum, deal) => sum + deal.amount,
                0,
              )

              return (
                <section
                  key={stage}
                  aria-label={STAGE_LABELS[stage]}
                  className="bg-muted/40 flex w-72 shrink-0 flex-col rounded-lg border"
                >
                  <header className="flex items-center gap-2 border-b px-3 py-2.5">
                    <h2 className="text-sm font-semibold">
                      {STAGE_LABELS[stage]}
                    </h2>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {stageDeals.length}
                    </span>
                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                      {formatMoney(total, workspace.currency, {
                        compact: true,
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`New deal in ${STAGE_LABELS[stage]}`}
                      onClick={() => setEditor({ open: true, stage })}
                    >
                      <Plus />
                    </Button>
                  </header>

                  <div className="flex min-h-24 flex-col gap-2 p-2">
                    {stageDeals.length === 0 ? (
                      <p className="text-muted-foreground px-1 py-6 text-center text-xs">
                        No deals
                      </p>
                    ) : (
                      stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          currency={workspace.currency}
                          moving={movingId === deal.id}
                          onEdit={() => setEditor({ open: true, deal })}
                          onDelete={() => setDeleting(deal)}
                          onMove={(next) =>
                            move.mutate({ id: deal.id, stage: next })
                          }
                        />
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      <DealDialog
        open={editor.open}
        deal={editor.deal}
        defaults={{ stage: editor.stage }}
        onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
      />

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${deleting?.title ?? 'deal'}?`}
        description="This removes the deal from the pipeline and the dashboard totals."
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </div>
  )
}

function DealCard({
  deal,
  currency,
  moving,
  onEdit,
  onDelete,
  onMove,
}: {
  deal: Deal
  currency: string
  moving: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (stage: DealStage) => void
}) {
  return (
    <article
      className={cn(
        'bg-card flex flex-col gap-1.5 rounded-md border p-3 shadow-xs transition-opacity',
        moving && 'opacity-50',
      )}
      aria-busy={moving}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-sm font-medium hover:underline"
          onClick={onEdit}
        >
          {deal.title}
        </button>
        <div className="-mt-1 -mr-1">
          <RowActions
            label={`Actions for ${deal.title}`}
            onEdit={onEdit}
            onDelete={onDelete}
          >
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {DEAL_STAGES.filter((stage) => stage !== deal.stage).map(
                  (stage) => (
                    <DropdownMenuItem
                      key={stage}
                      onSelect={() => onMove(stage)}
                    >
                      {STAGE_LABELS[stage]}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </RowActions>
        </div>
      </div>

      <p className="text-sm font-semibold tabular-nums">
        {formatMoney(deal.amount, currency)}
      </p>

      {deal.company || deal.contact ? (
        <p className="text-muted-foreground truncate text-xs">
          {[deal.company?.name, deal.contact && contactName(deal.contact)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}

      {deal.expectedCloseDate ? (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <CalendarDays className="size-3" />
          {formatDate(deal.expectedCloseDate)}
        </p>
      ) : null}
    </article>
  )
}
