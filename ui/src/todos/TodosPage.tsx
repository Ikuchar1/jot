import { Box, Button, CircularProgress, List, ListItem, ListItemText } from '@mui/material'
import { useListTodos } from '../api/generated'
import QuickAdd from './QuickAdd'

export default function TodosPage() {
  const { data: todos, isError, isFetching, refetch } = useListTodos()

  return (
    <>
      <QuickAdd />
      {/* Todos that loaded stay even if a later reload fails; the toast says why */}
      {todos && (todos.length > 0 || !isError) ? (
        <List>
          {todos.map((todo) => (
            <ListItem key={todo.id}>
              <ListItemText primary={todo.title} />
            </ListItem>
          ))}
        </List>
      ) : (
        // Otherwise a spinner while it's trying (retries included), so an API that can't be reached doesn't look like
        // an empty list, and once it gives up, a way to try again
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          {isError && !isFetching ? (
            <Button onClick={() => refetch()}>Try again</Button>
          ) : (
            <CircularProgress aria-label="Loading todos" />
          )}
        </Box>
      )}
    </>
  )
}
