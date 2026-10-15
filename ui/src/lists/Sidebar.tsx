import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { NavLink, useMatch } from 'react-router'
import { useListLists } from '../api/generated'

export const sidebarWidth = 240

// phone: a drawer that slides in over the page while open; otherwise it's always there, beside the page
type Props = { phone: boolean; open: boolean; onClose: () => void }

// Every list, with how many of its todos aren't done. The API sends them in order, Inbox first.
export default function Sidebar({ phone, open, onClose }: Props) {
  const { data: lists } = useListLists()
  const currentListId = useMatch('/lists/:listId')?.params.listId

  return (
    <Box component="nav" aria-label="Lists" sx={{ width: { sm: sidebarWidth }, flexShrink: { sm: 0 } }}>
      <Drawer
        variant={phone ? 'temporary' : 'permanent'}
        open={phone ? open : true}
        onClose={onClose}
        sx={{ '& .MuiDrawer-paper': { width: sidebarWidth, boxSizing: 'border-box' } }}
      >
        <Toolbar>
          <Typography variant="h6" component="p">
            Jot
          </Typography>
        </Toolbar>
        <List>
          {lists?.map((list) => (
            <ListItemButton
              key={list.id}
              component={NavLink}
              to={`/lists/${list.id}`}
              selected={list.id === currentListId}
              // On a phone, opening a list closes the drawer so its page shows
              onClick={onClose}
            >
              <ListItemText primary={list.name} />
              <Typography variant="body2" color="text.secondary">
                {list.notDoneCount}
              </Typography>
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </Box>
  )
}
