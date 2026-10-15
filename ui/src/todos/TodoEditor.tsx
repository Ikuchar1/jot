import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useId, useState, type FormEvent } from 'react'
import { useListLists } from '../api/generated'
import type { TodoDto } from '../api/generated/model'
import { useUpdate } from './useUpdate'

// listId is the list whose page it's opened from
type Props = { todo: TodoDto; listId: string; open: boolean; onClose: () => void }

// Everything about a todo that can be changed. Later slices add their fields here (due date, priority).
export default function TodoEditor({ todo, listId, open, onClose }: Props) {
  const titleId = useId()
  // Full screen on a phone, where a floating dialog leaves little room for the keyboard
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'))

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth aria-labelledby={titleId}>
      <DialogTitle id={titleId}>Edit todo</DialogTitle>
      {/* The dialog unmounts its contents once closed, so each opening starts from the todo as it is now */}
      <EditorForm todo={todo} listId={listId} onClose={onClose} />
    </Dialog>
  )
}

function EditorForm({ todo, listId, onClose }: Omit<Props, 'open'>) {
  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes ?? '')
  const [moveTo, setMoveTo] = useState(todo.listId)
  const { data: lists } = useListLists()
  const update = useUpdate(listId)

  // The API would turn it down anyway; this saves the round trip and the toast. A disabled Save also stops Enter from
  // submitting the form.
  const canSave = title.trim() !== ''

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // An emptied notes box means no notes, which the list's cache should hold as null too, like the API does
    // Always with its list: the API puts a todo saved without one in the Inbox
    update(todo.id, { title, notes: notes.trim() ? notes : null, listId: moveTo })
    // The list shows the edit right away, so there's nothing to wait for
    onClose()
  }

  return (
    // A form so Enter in the title saves
    <form onSubmit={handleSubmit}>
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
        {/* Once the lists load, since the picker can only show a list it has */}
        {lists && (
          <TextField
            select
            label="List"
            value={moveTo}
            onChange={(event) => setMoveTo(event.target.value)}
            fullWidth
            margin="dense"
          >
            {lists.map((list) => (
              <MenuItem key={list.id} value={list.id}>
                {list.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!canSave}>
          Save
        </Button>
      </DialogActions>
    </form>
  )
}
