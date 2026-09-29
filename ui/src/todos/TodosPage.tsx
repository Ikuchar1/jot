import { List, ListItem, ListItemText } from '@mui/material'
import { useListTodos } from '../api/generated'
import QuickAdd from './QuickAdd'

export default function TodosPage() {
  const { data: todos = [] } = useListTodos()

  return (
    <>
      <QuickAdd />
      <List>
        {todos.map((todo) => (
          <ListItem key={todo.id}>
            <ListItemText primary={todo.title} />
          </ListItem>
        ))}
      </List>
    </>
  )
}
