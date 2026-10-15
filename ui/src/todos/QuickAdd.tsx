import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useState, type FormEvent } from 'react'
import { useListLists } from '../api/generated'
import { useQuickAdd } from './useQuickAdd'

// listId is the list whose page it's on, which new todos go to unless another list is picked
export default function QuickAdd({ listId }: { listId: string }) {
  const [title, setTitle] = useState('')
  const [addTo, setAddTo] = useState(listId)
  const { data: lists } = useListLists()
  const add = useQuickAdd(listId)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // The API would turn it down anyway; this saves the round trip and the toast
    if (!title.trim()) {
      return
    }
    add(title, addTo)
    setTitle('')
  }

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {/* A form so Enter submits. Only the title is in it: a browser won't submit on Enter in a form with two fields */}
      <Box component="form" onSubmit={handleSubmit} sx={{ flexGrow: 1 }}>
        {/* No browser suggestions: it saves every title submitted, so they'd be old todos */}
        <TextField
          label="Add a todo"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
          fullWidth
        />
      </Box>
      {/* Once the lists load, since the picker can only show a list it has */}
      {lists && (
        <TextField
          select
          label="List"
          value={addTo}
          onChange={(event) => setAddTo(event.target.value)}
          sx={{ minWidth: 120 }}
        >
          {lists.map((list) => (
            <MenuItem key={list.id} value={list.id}>
              {list.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  )
}
