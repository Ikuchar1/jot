import { Box, CircularProgress, List, ListItem, ListItemText } from '@mui/material'
import { useListTodos } from '../api/generated'
import QuickAdd from './QuickAdd'

export default function TodosPage() {
  // Pending until the first load succeeds or gives up, retries included, so an API that can't be reached shows as
  // still trying rather than as an empty list
  const { data: todos = [], isPending } = useListTodos()

  return (
    <>
      <QuickAdd />
      {isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Loading todos" />
        </Box>
      ) : (
        <List>
          {todos.map((todo) => (
            <ListItem key={todo.id}>
              <ListItemText primary={todo.title} />
            </ListItem>
          ))}
        </List>
      )}
    </>
  )
}
