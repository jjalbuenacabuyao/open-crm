import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'

import type { ReactNode } from 'react'

/** The "…" menu at the end of a table row or card. */
export function RowActions({
  label,
  onEdit,
  onDelete,
  children,
}: {
  /** Names the record for screen readers, e.g. "Actions for Acme". */
  label: string
  onEdit: () => void
  onDelete: () => void
  /** Extra items, placed between Edit and Delete. */
  children?: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        {children}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
