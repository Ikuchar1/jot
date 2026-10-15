import type { QueryClient } from '@tanstack/react-query'
import { getListListsQueryKey, getListTodosQueryKey } from '../api/generated'

// For a change to the todos (an add, a check) once it has saved or failed: re-sync every list's todos with what the API
// saved, but only once nothing else is still saving, since the refetch would undo its optimistic change. The change
// calling this still counts as saving, hence 1. The lists come along, so the sidebar's not-done counts catch up too.
export function resyncTodos(queryClient: QueryClient) {
  if (queryClient.isMutating() === 1) {
    queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() })
    queryClient.invalidateQueries({ queryKey: getListListsQueryKey() })
  }
}
