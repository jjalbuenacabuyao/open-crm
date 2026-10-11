import { useMutation, useQueryClient } from '@tanstack/react-query'

import { workspaceKey } from '#/lib/crm-queries.ts'
import { useActiveWorkspace } from '#/lib/workspace.ts'

/**
 * A mutation against the active workspace that refreshes all of its cached
 * data on success. The invalidation is not awaited, so the caller's
 * `mutateAsync` resolves as soon as the write lands and a form can close
 * without waiting for every list to refetch.
 */
export function useWorkspaceMutation<TVariables, TData>(
  mutationFn: (workspaceId: string, variables: TVariables) => Promise<TData>,
) {
  const workspace = useActiveWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(workspace.id, variables),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKey(workspace.id),
      })
    },
  })
}
