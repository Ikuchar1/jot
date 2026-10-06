import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  getDeleteTodoMutationKey,
  getListTodosQueryKey,
  useRestoreTodo,
  type DeleteTodoMutationVariables,
} from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import { resyncTodos } from './resyncTodos'

// Undo for a delete
export function useRestore() {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey()
  // The API only needs the ID, but putting the todo back on the page needs all of it, and where it was
  const restoring = useRef(new Map<string, { todo: TodoDto; index: number }>())

  const { mutate } = useRestoreTodo({
    mutation: {
      // Put the todo back in its old place right away, before the API answers
      onMutate: async ({ id }) => {
        // A list fetch still in flight would take it back out when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        const { todo, index } = restoring.current.get(id)!
        queryClient.setQueryData<TodoDto[]>(todosKey, (todos = []) => todos.toSpliced(index, 0, todo))
        // The restore isn't sent until this resolves. Sent alongside a delete still saving, the API could take the
        // restore first and the delete second, leaving the todo deleted after the page showed it coming back.
        await deleteSettled(queryClient, id)
      },
      // The save failed, so take it back out. Only this one, so other changes still saving stay.
      onError: (_error, { id }) =>
        queryClient.setQueryData<TodoDto[]>(todosKey, (todos) => todos?.filter((todo) => todo.id !== id)),
      // Then re-sync with what the API saved, which also puts it where the API says it goes
      onSettled: (_data, _error, { id }) => {
        restoring.current.delete(id)
        resyncTodos(queryClient)
      },
    },
  })

  // index is where the todo was in the list when it was deleted
  return (todo: TodoDto, index: number) => {
    restoring.current.set(todo.id, { todo, index })
    mutate({ id: todo.id })
  }
}

// Resolves once no delete of this todo is still saving
function deleteSettled(queryClient: QueryClient, id: string) {
  const mutations = queryClient.getMutationCache()
  const deleting = () =>
    mutations
      .findAll({ mutationKey: getDeleteTodoMutationKey(), status: 'pending' })
      .some((mutation) => (mutation.state.variables as DeleteTodoMutationVariables).id === id)

  return new Promise<void>((resolve) => {
    if (!deleting()) {
      resolve()
      return
    }
    const unsubscribe = mutations.subscribe(() => {
      if (!deleting()) {
        unsubscribe()
        resolve()
      }
    })
  })
}
