import { useEffect, useState } from 'react'
import {
  Outlet,
  createFileRoute,
  useHydrated,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'

import { WorkspaceGate } from '#/components/crm/workspace-gate.tsx'
import { AppSidebar } from '#/components/layout/app-sidebar.tsx'
import { SiteHeader } from '#/components/layout/site-header.tsx'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar.tsx'
import { useAuth } from '#/lib/auth.ts'

export const Route = createFileRoute('/_shell')({
  component: ShellLayout,
})

function ShellLayout() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (status === 'anonymous') {
      void navigate({
        to: '/login',
        search: { redirect: location.pathname },
        replace: true,
      })
    }
  }, [status, navigate, location.pathname])

  // The server always renders the spinner, so the first client render must
  // too. The session can settle from localStorage before this lazily loaded
  // route hydrates, and rendering the shell then is a hydration mismatch.
  const hydrated = useHydrated()

  if (!hydrated || status !== 'authenticated') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoaderCircle className="text-muted-foreground size-5 animate-spin" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  return (
    <WorkspaceGate>
      <AppShell />
    </WorkspaceGate>
  )
}

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

function readSidebarState(): boolean {
  if (typeof document === 'undefined') {
    return true
  }

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${SIDEBAR_COOKIE_NAME}=`))

  return match ? match.split('=')[1] === 'true' : true
}

function AppShell() {
  const [defaultOpen] = useState(readSidebarState)

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      {/* min-w-0 lets wide content (the pipeline board) scroll inside the page instead of widening it. */}
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
