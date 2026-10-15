import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useId, useState } from 'react'
import type { TodoDto } from '../api/generated/model'
import TodoEditor from './TodoEditor'
import { useSetDone } from './useSetDone'

type Props = { todo: TodoDto; onDelete: (todo: TodoDto) => void }

export default function TodoItem({ todo, onDelete }: Props) {
  const titleId = useId()
  const setDone = useSetDone()
  const [editing, setEditing] = useState(false)

  return (
    <ListItem
      secondaryAction={
        <IconButton edge="end" aria-label={`Delete ${todo.title}`} onClick={() => onDelete(todo)}>
          <DeleteOutlinedIcon />
        </IconButton>
      }
    >
      <ListItemIcon>
        {/* Named by the title, so a screen reader says "Buy milk, checkbox" */}
        <Checkbox
          edge="start"
          checked={todo.done}
          onChange={(_event, checked) => setDone(todo.id, checked)}
          slotProps={{ input: { 'aria-labelledby': titleId } }}
        />
      </ListItemIcon>
      {/* Only the title opens the editor, so tapping the checkbox or delete button never does */}
      <ListItemButton onClick={() => setEditing(true)} sx={{ borderRadius: 1 }}>
        <ListItemText id={titleId} primary={todo.title} />
      </ListItemButton>
      <TodoEditor todo={todo} open={editing} onClose={() => setEditing(false)} />
    </ListItem>
  )
}
