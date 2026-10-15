import { useQueryClient } from '@tanstack/react-query'
import { getListTodosQueryKey, useUpdateTodo } from '../api/generated'
import type { TodoDto, UpdateTodoRequest } from '../api/generated/model'
import { resyncTodos } from './resyncTodos'

// listId is the list whose page it's edited on
export function useUpdate(listId: string) {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey({ listId })

  const patch = (id: string, { title, notes }: Pick<TodoDto, 'title' | 'notes'>) =>
    queryClient.setQueryData<TodoDto[]>(todosKey, (todos) =>
      todos?.map((todo) => (todo.id === id ? { ...todo, title, notes } : todo)),
    )

  const { mutate } = useUpdateTodo({
    mutation: {
      // Show the edit right away, before the API answers, keeping what the todo had for onError
      onMutate: async ({ id, data }) => {
        // A list fetch still in flight would undo the edit when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        const before = queryClient.getQueryData<TodoDto[]>(todosKey)?.find((todo) => todo.id === id)
        patch(id, data)
        return before && { title: before.title, notes: before.notes }
      },
      // The save failed, so put back this todo's old title and notes. Only those: restoring a snapshot of the list
      // would also undo other changes still saving.
      onError: (_error, { id }, before) => {
        if (before) {
          patch(id, before)
        }
      },
      // Then re-sync with what the API saved
      onSettled: () => resyncTodos(queryClient),
    },
  })

  return (id: string, fields: UpdateTodoRequest) => mutate({ id, data: fields })
}
