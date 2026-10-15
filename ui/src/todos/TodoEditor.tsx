import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useId, useState } from 'react'
import type { TodoDto } from '../api/generated/model'

type Props = { todo: TodoDto; open: boolean; onClose: () => void }

// Everything about a todo that can be changed. Later slices add their fields here (list, due date, priority).
export default function TodoEditor({ todo, open, onClose }: Props) {
  const titleId = useId()
  // Full screen on a phone, where a floating dialog leaves little room for the keyboard
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'))

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth aria-labelledby={titleId}>
      <DialogTitle id={titleId}>Edit todo</DialogTitle>
      {/* The dialog unmounts its contents once closed, so each opening starts from the todo as it is now */}
      <EditorForm todo={todo} />
    </Dialog>
  )
}

function EditorForm({ todo }: { todo: TodoDto }) {
  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes ?? '')

  return (
    <DialogContent>
      <TextField
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoComplete="off"
        fullWidth
        margin="dense"
      />
      <TextField
        label="Notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        multiline
        minRows={3}
        fullWidth
        margin="dense"
      />
    </DialogContent>
  )
}
