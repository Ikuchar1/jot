import { useQueryClient } from '@tanstack/react-query'
import { getListTodosQueryKey, useUpdateTodo } from '../api/generated'
import type { TodoDto, UpdateTodoRequest } from '../api/generated/model'
import { resyncTodos } from './resyncTodos'

export function useUpdate() {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey()

  const patch = (id: string, fields: UpdateTodoRequest) =>
    queryClient.setQueryData<TodoDto[]>(todosKey, (todos) =>
      todos?.map((todo) => (todo.id === id ? { ...todo, ...fields } : todo)),
    )

  const { mutate } = useUpdateTodo({
    mutation: {
      // Show the edit right away, before the API answers
      onMutate: async ({ id, data }) => {
        // A list fetch still in flight would undo the edit when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        patch(id, data)
      },
      // Then re-sync with what the API saved
      onSettled: () => resyncTodos(queryClient),
    },
  })

  return (id: string, fields: UpdateTodoRequest) => mutate({ id, data: fields })
}
