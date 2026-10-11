import { Badge } from '#/components/ui/badge.tsx'
import { STAGE_LABELS } from '#/lib/format.ts'

import type { DealStage } from '#/lib/crm-api.ts'

const VARIANTS = {
  lead: 'outline',
  qualified: 'outline',
  proposal: 'secondary',
  negotiation: 'secondary',
  won: 'default',
  lost: 'destructive',
} as const

export function StageBadge({ stage }: { stage: DealStage }) {
  return <Badge variant={VARIANTS[stage]}>{STAGE_LABELS[stage]}</Badge>
}
