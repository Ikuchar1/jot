import { useQueryClient } from '@tanstack/react-query'
import { getListTodosQueryKey, useDeleteTodo } from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import { resyncTodos } from './resyncTodos'

export function useDelete() {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey()

  const { mutate } = useDeleteTodo({
    mutation: {
      // Take the todo off right away, before the API answers
      onMutate: async ({ id }) => {
        // A list fetch still in flight would put it back when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        queryClient.setQueryData<TodoDto[]>(todosKey, (todos) => todos?.filter((todo) => todo.id !== id))
      },
      onSettled: () => resyncTodos(queryClient),
    },
  })

  return (id: string) => mutate({ id })
}
