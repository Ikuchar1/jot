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
      // Show the edit right away, before the API answers, keeping what the todo was and where for onError. Moved to
      // another list, it leaves this list's page.
      onMutate: async ({ id, data }) => {
        // A list fetch still in flight would undo the edit when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        const todos = queryClient.getQueryData<TodoDto[]>(todosKey) ?? []
        const index = todos.findIndex((todo) => todo.id === id)
        if (index === -1) {
          return undefined
        }
        if (data.listId && data.listId !== listId) {
          queryClient.setQueryData<TodoDto[]>(todosKey, todos.toSpliced(index, 1))
        } else {
          patch(id, data)
        }
        return { todo: todos[index], index }
      },
      // The save failed, so put back this todo's old title and notes, or the todo itself if it moved off the page.
      // Only those: restoring a snapshot of the list would also undo other changes still saving.
      onError: (_error, { id }, before) => {
        if (!before) {
          return
        }
        if (queryClient.getQueryData<TodoDto[]>(todosKey)?.some((todo) => todo.id === id)) {
          patch(id, before.todo)
        } else {
          queryClient.setQueryData<TodoDto[]>(todosKey, (todos) => todos?.toSpliced(before.index, 0, before.todo))
        }
      },
      // Then re-sync with what the API saved
      onSettled: () => resyncTodos(queryClient),
    },
  })

  return (id: string, fields: UpdateTodoRequest) => mutate({ id, data: fields })
}
