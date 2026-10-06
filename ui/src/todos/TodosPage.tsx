import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import { useListTodos } from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import QuickAdd from './QuickAdd'
import TodoItem from './TodoItem'
import { useDelete } from './useDelete'

export default function TodosPage() {
  const { data: todos, isError, isFetching, refetch } = useListTodos()
  const deleteTodo = useDelete()

  return (
    <>
      <QuickAdd />
      {/* Todos that loaded stay even if a later reload fails; the toast says why */}
      {todos && (todos.length > 0 || !isError) ? (
        <TodoSections todos={todos} onDelete={(todo) => deleteTodo(todo.id)} />
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

// The API sends the todos in order, done ones last, so this only splits them; it doesn't sort
function TodoSections({ todos, onDelete }: { todos: TodoDto[]; onDelete: (todo: TodoDto) => void }) {
  const notDone = todos.filter((todo) => !todo.done)
  const done = todos.filter((todo) => todo.done)

  return (
    <>
      <List>
        {notDone.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onDelete={onDelete} />
        ))}
      </List>
      {done.length > 0 && (
        // Collapsed until opened, and its todos aren't rendered until then
        <Accordion disableGutters elevation={0} slotProps={{ transition: { unmountOnExit: true } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>Done ({done.length})</AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List>
              {done.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onDelete={onDelete} />
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </>
  )
}
