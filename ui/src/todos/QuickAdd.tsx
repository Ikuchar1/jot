import { TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { useQuickAdd } from './useQuickAdd'

export default function QuickAdd() {
  const [title, setTitle] = useState('')
  const add = useQuickAdd()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    add(title)
    setTitle('')
  }

  return (
    // A form so Enter submits
    <form onSubmit={handleSubmit}>
      <TextField label="Add a todo" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
    </form>
  )
}
