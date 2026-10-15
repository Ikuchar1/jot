import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useId } from 'react'
import type { TodoDto } from '../api/generated/model'
import { useSetDone } from './useSetDone'

type Props = { todo: TodoDto; onDelete: (todo: TodoDto) => void }

export default function TodoItem({ todo, onDelete }: Props) {
  const titleId = useId()
  const setDone = useSetDone()

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
      <ListItemText id={titleId} primary={todo.title} />
    </ListItem>
  )
}
