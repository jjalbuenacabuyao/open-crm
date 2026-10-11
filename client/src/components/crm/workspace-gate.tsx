import { LoaderCircle } from 'lucide-react'

import { AuthLayout } from '#/components/auth/auth-layout.tsx'
import { CreateWorkspaceForm } from '#/components/crm/create-workspace-form.tsx'
import { QueryError } from '#/components/crm/query-state.tsx'
import { useWorkspaces } from '#/lib/workspace.ts'

import type { ReactNode } from 'react'

/**
 * Renders its children only once the user has a workspace to work in, which is
 * what lets every page under the shell call `useActiveWorkspace` without
 * handling the empty case. A first-time user gets the create form instead.
 */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { active, isPending, isError, error, refetch } = useWorkspaces()

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoaderCircle className="text-muted-foreground size-5 animate-spin" />
        <span className="sr-only">Loading workspaces</span>
      </div>
    )
  }

  if (isError) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <div className="w-full max-w-md">
          <QueryError
            title="Could not load your workspaces"
            error={error}
            onRetry={() => void refetch()}
          />
        </div>
      </main>
    )
  }

  if (!active) {
    return (
      <AuthLayout
        heading="Create your workspace"
        subheading="A workspace holds your companies, contacts, and deals."
      >
        <CreateWorkspaceForm />
      </AuthLayout>
    )
  }

  return children
}
