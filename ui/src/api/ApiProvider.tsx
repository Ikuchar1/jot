import { Alert, Snackbar, type SnackbarCloseReason } from '@mui/material'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, type DefaultOptions } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

type Props = { children: ReactNode; defaultOptions?: DefaultOptions }

// The QueryClient every API hook uses, and the toast that shows any failed call's message. Errors are caught once
// here, so components don't each have to handle them.
export default function ApiProvider({ children, defaultOptions }: Props) {
  // Kept separate from the message so the text doesn't vanish while the toast animates out
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [queryClient] = useState(() => {
    const showError = (error: Error) => {
      setMessage(error.message)
      setOpen(true)
    }
    return new QueryClient({
      queryCache: new QueryCache({ onError: showError }),
      mutationCache: new MutationCache({ onError: showError }),
      defaultOptions,
    })
  })

  // Not on a click elsewhere: tapping back into quick-add to try again would hide the message before it's read
  function handleClose(_event: unknown, reason?: SnackbarCloseReason) {
    if (reason !== 'clickaway') {
      setOpen(false)
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert severity="error" variant="filled" onClose={handleClose}>
          {message}
        </Alert>
      </Snackbar>
    </QueryClientProvider>
  )
}
