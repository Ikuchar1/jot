import { Alert, Snackbar } from '@mui/material'
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Snackbar open={open} autoHideDuration={6000} onClose={() => setOpen(false)}>
        <Alert severity="error" variant="filled" onClose={() => setOpen(false)}>
          {message}
        </Alert>
      </Snackbar>
    </QueryClientProvider>
  )
}
