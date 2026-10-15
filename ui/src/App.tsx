import MenuIcon from '@mui/icons-material/Menu'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useState } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import { useListLists } from './api/generated'
import Sidebar from './lists/Sidebar'
import TodosPage from './todos/TodosPage'

export default function App() {
  // On a phone the sidebar hides behind a menu button
  const phone = useMediaQuery(useTheme().breakpoints.down('sm'))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar phone={phone} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          {phone && (
            <IconButton edge="start" aria-label="Open lists" onClick={() => setSidebarOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Routes>
            <Route path="/" element={<InboxRedirect />} />
            <Route path="/lists/:listId" element={<ListRoute />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  )
}

// The app opens on the Inbox, which it only knows the ID of once the lists load
function InboxRedirect() {
  const inbox = useListLists().data?.find((list) => list.isInbox)
  return inbox ? (
    <Navigate to={`/lists/${inbox.id}`} replace />
  ) : (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress aria-label="Loading lists" />
    </Box>
  )
}

function ListRoute() {
  const { listId } = useParams()
  // Keyed by the list, so moving to another list's page starts it fresh (its Deleted toast included)
  return <TodosPage key={listId} listId={listId!} />
}
