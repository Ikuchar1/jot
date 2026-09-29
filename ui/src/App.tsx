import { Container, Typography } from '@mui/material'
import TodosPage from './todos/TodosPage'

export default function App() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Jot
      </Typography>
      <TodosPage />
    </Container>
  )
}
