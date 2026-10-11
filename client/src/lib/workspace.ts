import { useQuery } from '@tanstack/react-query'
import { Store, useSelector } from '@tanstack/react-store'

import { workspacesQuery } from '#/lib/crm-queries.ts'

import type { Workspace } from '#/lib/crm-api.ts'

const STORAGE_KEY = 'open-crm.active-workspace'

function readStoredId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * The workspace the user picked, remembered per browser. It is only a
 * preference: `useWorkspaces` falls back to the first workspace whenever the
 * stored ID is missing or no longer in the list (deleted, or left behind by a
 * previous account on this browser).
 */
const selectionStore = new Store<{ workspaceId: string | null }>({
  // Null during SSR. Nothing reads the selection there: the shell only renders
  // workspace data in the browser, once the Supabase session has loaded.
  workspaceId: readStoredId(),
})

export function setActiveWorkspace(workspaceId: string | null): void {
  selectionStore.setState(() => ({ workspaceId }))
  try {
    if (workspaceId) {
      window.localStorage.setItem(STORAGE_KEY, workspaceId)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts the tab.
  }
}

export function useWorkspaces() {
  const selectedId = useSelector(selectionStore, (state) => state.workspaceId)
  const query = useQuery(workspacesQuery())
  const workspaces = query.data ?? []

  const active: Workspace | undefined =
    workspaces.find((workspace) => workspace.id === selectedId) ??
    workspaces.at(0)

  return { ...query, workspaces, active }
}

/**
 * The active workspace, for components rendered inside the shell. The shell
 * only mounts its pages once a workspace exists, so this never returns
 * undefined there.
 */
export function useActiveWorkspace(): Workspace {
  const { active } = useWorkspaces()
  if (!active) {
    throw new Error('useActiveWorkspace called outside the workspace gate')
  }
  return active
}
