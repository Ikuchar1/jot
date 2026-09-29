import { useQueryClient } from '@tanstack/react-query'
import { v7 } from 'uuid'
import { getListTodosQueryKey, useAddTodo } from '../api/generated'
import type { TodoDto } from '../api/generated/model'

export function useQuickAdd() {
  const queryClient = useQueryClient()
  const todosKey = getListTodosQueryKey()

  const { mutate } = useAddTodo({
    mutation: {
      // Show the todo right away, before the API answers
      onMutate: async ({ data }) => {
        // A list fetch still in flight would overwrite the optimistic todo when it lands
        await queryClient.cancelQueries({ queryKey: todosKey })
        const previous = queryClient.getQueryData<TodoDto[]>(todosKey)
        // The UI always sends an ID (below), so the optimistic todo already has its real one
        const todo: TodoDto = { id: data.id!, title: data.title }
        queryClient.setQueryData<TodoDto[]>(todosKey, (todos = []) => [...todos, todo])
        return { previous }
      },
      // The save failed, so take the todo back out
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(todosKey, context?.previous)
      },
    },
  })

  return (title: string) => mutate({ data: { id: v7(), title } })
}
