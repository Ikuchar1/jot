import { useQueryClient } from '@tanstack/react-query'
import { getListTodosQueryKey, getRestoreTodoMutationKey, useDeleteTodo } from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import { earlierSavesSettled } from './earlierSaves'
import { resyncTodos } from './resyncTodos'

export function useDelete() {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey()

  const { mutate } = useDeleteTodo({
    mutation: {
      // Take the todo off right away, before the API answers
      onMutate: async ({ id }) => {
        // Deleting it again after an Undo: the delete isn't sent until that restore has saved, or the API could take
        // the delete first and the restore second, leaving the todo back after the page showed it gone
        const restoreSaved = earlierSavesSettled(queryClient, getRestoreTodoMutationKey(), id)
        // A list fetch still in flight would put it back when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        const todos = queryClient.getQueryData<TodoDto[]>(todosKey) ?? []
        const index = todos.findIndex((todo) => todo.id === id)
        if (index === -1) {
          await restoreSaved
          return undefined
        }
        queryClient.setQueryData<TodoDto[]>(todosKey, todos.toSpliced(index, 1))
        await restoreSaved
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

  // onFailed lets the caller close its Deleted toast: once the todo is back, there's nothing to undo
  return (id: string, onFailed?: () => void) => mutate({ id }, { onError: onFailed })
}
