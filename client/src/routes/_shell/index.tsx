import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Building2, Handshake, Trophy, Users } from 'lucide-react'

import { QueryError, Spinner } from '#/components/crm/query-state.tsx'
import { StageBadge } from '#/components/crm/stage-badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { dealsQuery, statsQuery } from '#/lib/crm-queries.ts'
import { STAGE_LABELS, formatMoney, formatTimestamp } from '#/lib/format.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

import type { ReactNode } from 'react'

export const Route = createFileRoute('/_shell/')({
  staticData: { title: 'Dashboard' },
  component: Dashboard,
})

function Dashboard() {
  const workspace = useActiveWorkspace()
  const stats = useQuery(statsQuery(workspace.id))
  const recentDeals = useQuery(dealsQuery(workspace.id, { pageSize: 6 }))

  if (stats.isError) {
    return (
      <QueryError error={stats.error} onRetry={() => void stats.refetch()} />
    )
  }
  if (!stats.data) {
    return <Spinner />
  }

  const { data } = stats
  const money = (amount: number) =>
    formatMoney(amount, workspace.currency, { compact: true })
  const largestStage = Math.max(1, ...data.stages.map((stage) => stage.amount))

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspace.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          An overview of your pipeline and relationships.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={money(data.openPipeline)}
          detail={`${data.openDeals} open ${data.openDeals === 1 ? 'deal' : 'deals'}`}
          icon={<Handshake />}
        />
        <StatCard
          label="Won"
          value={money(data.wonAmount)}
          detail={
            data.winRate === null
              ? 'No closed deals yet'
              : `${Math.round(data.winRate * 100)}% win rate`
          }
          icon={<Trophy />}
        />
        <StatCard
          label="Companies"
          value={data.companies.toLocaleString()}
          detail={<Link to="/companies">View all</Link>}
          icon={<Building2 />}
        />
        <StatCard
          label="Contacts"
          value={data.contacts.toLocaleString()}
          detail={<Link to="/contacts">View all</Link>}
          icon={<Users />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by stage</CardTitle>
            <CardDescription>Deal value in each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {data.stages.map((stage) => (
                <li
                  key={stage.stage}
                  className="grid grid-cols-[6.5rem_1fr_5rem] items-center gap-3 text-sm"
                >
                  <span>
                    {STAGE_LABELS[stage.stage]}{' '}
                    <span className="text-muted-foreground tabular-nums">
                      ({stage.count})
                    </span>
                  </span>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={
                        stage.stage === 'lost'
                          ? 'bg-muted-foreground/40 h-full rounded-full'
                          : 'bg-primary h-full rounded-full'
                      }
                      style={{
                        width: `${(stage.amount / largestStage) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-right tabular-nums">
                    {money(stage.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently updated deals</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/deals">
                  Pipeline
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recentDeals.isError ? (
              <QueryError error={recentDeals.error} />
            ) : !recentDeals.data ? (
              <Spinner className="py-4" />
            ) : recentDeals.data.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No deals yet.{' '}
                <Link to="/deals" className="text-foreground underline">
                  Open the pipeline
                </Link>{' '}
                to add one.
              </p>
            ) : (
              <ul className="divide-y">
                {recentDeals.data.items.map((deal) => (
                  <li key={deal.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {deal.title}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {deal.company?.name ?? 'No company'} · updated{' '}
                        {formatTimestamp(deal.updatedAt)}
                      </p>
                    </div>
                    <StageBadge stage={deal.stage} />
                    <span className="w-20 text-right text-sm tabular-nums">
                      {money(deal.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: ReactNode
  icon: ReactNode
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardAction className="text-muted-foreground [&_svg]:size-4">
          {icon}
        </CardAction>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-xs [&_a]:underline [&_a]:underline-offset-4">
        {detail}
      </CardContent>
    </Card>
  )
}
