import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import Snackbar, { type SnackbarCloseReason } from '@mui/material/Snackbar'
import { useState } from 'react'
import { useListTodos } from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import QuickAdd from './QuickAdd'
import TodoItem from './TodoItem'
import { useDelete } from './useDelete'
import { useRestore } from './useRestore'

export default function TodosPage() {
  const { data: todos, isError, isFetching, refetch } = useListTodos()
  const deleteTodo = useDelete()
  const restore = useRestore()
  // The Deleted toast: the last todo deleted and where it was, which Undo puts back. The todo stays after it closes, so
  // it's still there while the toast animates out
  const [toast, setToast] = useState<{ todo: TodoDto; index: number; open: boolean } | null>(null)

  // Closes the toast only if it's still this todo's: a later delete has replaced it otherwise
  const closeToastFor = (id: string) => setToast((t) => (t?.todo.id === id ? { ...t, open: false } : t))

  function handleDelete(todo: TodoDto) {
    setToast({ todo, index: todos!.findIndex((t) => t.id === todo.id), open: true })
    // A failed delete puts the todo back, so there's nothing left to undo
    deleteTodo(todo.id, () => closeToastFor(todo.id))
  }

  function handleUndo() {
    // Not while the toast animates out after closing: a failed delete closes it, and the todo is already back
    if (toast?.open) {
      restore(toast.todo, toast.index)
      closeToastFor(toast.todo.id)
    }
  }

  // Not on a click elsewhere: deleting another todo replaces the toast anyway
  function handleToastClose(_event: unknown, reason?: SnackbarCloseReason) {
    if (reason !== 'clickaway' && toast) {
      closeToastFor(toast.todo.id)
    }
  }

  return (
    <>
      <QuickAdd />
      {/* Todos that loaded stay even if a later reload fails; the toast says why */}
      {todos && (todos.length > 0 || !isError) ? (
        <TodoSections todos={todos} onDelete={handleDelete} />
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
      {/* Keyed by the todo, so a second delete replaces the first's toast and starts its 5 seconds over */}
      <Snackbar
        key={toast?.todo.id}
        open={toast?.open ?? false}
        autoHideDuration={5000}
        onClose={handleToastClose}
        message="Deleted"
        action={
          <Button color="inherit" onClick={handleUndo}>
            Undo
          </Button>
        }
      />
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
