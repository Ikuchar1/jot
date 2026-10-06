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
        const todos = queryClient.getQueryData<TodoDto[]>(todosKey) ?? []
        const index = todos.findIndex((todo) => todo.id === id)
        if (index === -1) {
          return undefined
        }
        queryClient.setQueryData<TodoDto[]>(todosKey, todos.toSpliced(index, 1))
        // Kept so a failed save can put it back where it was
        return { todo: todos[index], index }
      },
      // The save failed, so put it back. Only this one: restoring a snapshot from before the delete would also undo
      // other changes made since then that are still saving.
      onError: (_error, _variables, deleted) => {
        if (deleted) {
          queryClient.setQueryData<TodoDto[]>(todosKey, (todos) => todos?.toSpliced(deleted.index, 0, deleted.todo))
        }
      },
      onSettled: () => resyncTodos(queryClient),
    },
  })

  return (id: string) => mutate({ id })
}
