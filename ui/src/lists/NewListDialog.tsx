import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { v7 } from 'uuid'
import { getListListsQueryKey, useAddList } from '../api/generated'

type Props = { open: boolean; onClose: () => void }

export default function NewListDialog({ open, onClose }: Props) {
  const titleId = useId()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>New list</DialogTitle>
      {/* The dialog unmounts its contents once closed, so each opening starts with an empty name */}
      <NewListForm onClose={onClose} />
    </Dialog>
  )
}

function NewListForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  const { mutate, isPending } = useAddList({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListListsQueryKey() }) },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Stays open until it's saved, so a name the API turns down (a list by that name already) can be fixed; the toast
    // says why
    mutate({ data: { id: v7(), name } }, { onSuccess: onClose })
  }

  return (
    // A form so Enter in the name creates it
    <form onSubmit={handleSubmit}>
      <DialogContent>
        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          autoFocus
          fullWidth
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {/* The API would turn a blank name down anyway; a disabled Create also stops Enter from submitting */}
        <Button type="submit" disabled={!name.trim() || isPending}>
          Create
        </Button>
      </DialogActions>
    </form>
  )
}
