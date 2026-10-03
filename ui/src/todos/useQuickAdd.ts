import { useQueryClient } from '@tanstack/react-query'
import { v7 } from 'uuid'
import { getListTodosQueryKey, useAddTodo } from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import { resyncTodos } from './resyncTodos'

export function useQuickAdd() {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey()

  const { mutate } = useAddTodo({
    mutation: {
      // Show the todo right away, before the API answers
      onMutate: async ({ data }) => {
        // A list fetch still in flight would overwrite the optimistic todo when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        // The UI always sends an ID (below), so the optimistic todo already has its real one
        const todo: TodoDto = { id: data.id!, title: data.title, done: false }
        queryClient.setQueryData<TodoDto[]>(todosKey, (todos = []) => [...todos, todo])
      },
      // The save failed, so take the todo back out. Only this one: restoring a snapshot from before the add
      // would also drop todos quick-added since then that are still saving.
      onError: (_error, { data }) => {
        queryClient.setQueryData<TodoDto[]>(todosKey, (todos) => todos?.filter((todo) => todo.id !== data.id))
      },
      // Then re-sync with what the API saved
      onSettled: () => resyncTodos(queryClient),
    },
  })

  return (title: string) => mutate({ data: { id: v7(), title } })
}
