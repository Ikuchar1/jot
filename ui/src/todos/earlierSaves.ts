import type { MutationKey, QueryClient } from '@tanstack/react-query'

// Resolves once the saves of this todo that were already pending when it's called have settled. Later ones are left
// out, so a delete, its Undo and a second delete reach the API in the order they were tapped.
// Call it before the first await in onMutate, so "already pending" means pending when the user tapped.
export function earlierSavesSettled(queryClient: QueryClient, mutationKey: MutationKey, id: string) {
  const mutations = queryClient.getMutationCache()
  const earlier = mutations
    .findAll({ mutationKey, status: 'pending' })
    .filter((mutation) => (mutation.state.variables as { id: string }).id === id)
  const pending = () => earlier.some((mutation) => mutation.state.status === 'pending')

  return new Promise<void>((resolve) => {
    if (!pending()) {
      resolve()
      return
    }
    const unsubscribe = mutations.subscribe(() => {
      if (!pending()) {
        unsubscribe()
        resolve()
      }
    })
  })
}
