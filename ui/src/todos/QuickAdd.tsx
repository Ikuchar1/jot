import { TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { useQuickAdd } from './useQuickAdd'

export default function QuickAdd() {
  const [title, setTitle] = useState('')
  const add = useQuickAdd()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // The API would turn it down anyway; this saves the round trip and the toast
    if (!title.trim()) {
      return
    }
    add(title)
    setTitle('')
  }

  return (
    // A form so Enter submits
    <form onSubmit={handleSubmit}>
      {/* No browser suggestions: it saves every title submitted, so they'd be old todos */}
      <TextField
        label="Add a todo"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoComplete="off"
        fullWidth
      />
    </form>
  )
}
