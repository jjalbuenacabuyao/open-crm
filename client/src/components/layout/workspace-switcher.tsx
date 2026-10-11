import { useState } from 'react'
import { useMatchRoute, useNavigate } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import { CreateWorkspaceForm } from '#/components/crm/create-workspace-form.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar.tsx'
import { setActiveWorkspace, useWorkspaces } from '#/lib/workspace.ts'

function WorkspaceMark({
  name,
  className,
}: {
  name: string
  className: string
}) {
  return (
    <div className={className} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

/** The workspace picker at the top of the sidebar. */
export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const { workspaces, active } = useWorkspaces()
  const [creating, setCreating] = useState(false)
  const matchRoute = useMatchRoute()
  const navigate = useNavigate()

  if (!active) {
    return null
  }

  // A detail page belongs to the workspace it was opened in; after switching,
  // its record would 404, so step back to the section's list.
  function leaveDetailPage() {
    if (matchRoute({ to: '/companies/$companyId' })) {
      void navigate({ to: '/companies' })
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <WorkspaceMark
                name={active.name}
                className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{active.name}</span>
                <span className="truncate text-xs">open-crm</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>

            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                className="gap-2 p-2"
                onSelect={() => {
                  if (workspace.id !== active.id) {
                    setActiveWorkspace(workspace.id)
                    leaveDetailPage()
                  }
                }}
              >
                <WorkspaceMark
                  name={workspace.name}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium"
                />
                <span className="truncate">{workspace.name}</span>
                {workspace.id === active.id ? (
                  <Check className="ml-auto size-4" />
                ) : null}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={() => setCreating(true)}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <span className="text-muted-foreground font-medium">
                New workspace
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New workspace</DialogTitle>
              <DialogDescription>
                Workspaces keep separate sets of companies, contacts, and deals.
              </DialogDescription>
            </DialogHeader>
            <CreateWorkspaceForm
              onCreated={() => {
                setCreating(false)
                leaveDetailPage()
              }}
            />
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
