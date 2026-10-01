import { useQueryClient } from '@tanstack/react-query'
import { getListTodosQueryKey, useSetTodoDone } from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import { resyncTodos } from './resyncTodos'

export function useSetDone() {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey()

  // Changing it in place is enough to move it: the list has every not-done todo before the done ones, so a todo
  // checked off lands at the top of Done, where the API puts it too
  const markDone = (id: string, done: boolean) =>
    queryClient.setQueryData<TodoDto[]>(todosKey, (todos) =>
      todos?.map((todo) => (todo.id === id ? { ...todo, done } : todo)),
    )

  const { mutate } = useSetTodoDone({
    mutation: {
      // Move the todo right away, before the API answers
      onMutate: async ({ id, data }) => {
        // A list fetch still in flight would undo the move when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        markDone(id, data.done)
      },
      // The save failed, so move it back. Only this one: restoring a snapshot from before the check would also undo
      // other todos checked since then that are still saving.
      onError: (_error, { id, data }) => markDone(id, !data.done),
      // Then re-sync with what the API saved, which also puts an un-checked todo back in its place
      onSettled: () => resyncTodos(queryClient),
    },
  })

  return (id: string, done: boolean) => mutate({ id, data: { done } })
}
