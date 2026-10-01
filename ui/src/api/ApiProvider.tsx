import { Alert, Snackbar, type SnackbarCloseReason } from '@mui/material'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, type DefaultOptions } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'

type Props = { children: ReactNode; defaultOptions?: DefaultOptions }

// The QueryClient every API hook uses, and the toast that shows any failed call's message. Errors are caught once
// here, so components don't each have to handle them.
export default function ApiProvider({ children, defaultOptions }: Props) {
  // Kept separate from the message so the text doesn't vanish while the toast animates out
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  // The query whose load failed, while the toast shows why; null when it's a save that failed
  const [failedLoad, setFailedLoad] = useState<string | null>(null)
  const [queryClient] = useState(() => {
    const showError = (error: Error, failedQueryHash: string | null) => {
      setMessage(error.message)
      setFailedLoad(failedQueryHash)
      setOpen(true)
    }
    return new QueryClient({
      queryCache: new QueryCache({ onError: (error, query) => showError(error, query.queryHash) }),
      mutationCache: new MutationCache({ onError: (error) => showError(error, null) }),
      defaultOptions,
    })
  })

  // Its error is old news once that load runs again (Try again, say)
  useEffect(() => {
    if (!failedLoad) {
      return
    }
    return queryClient.getQueryCache().subscribe(({ query }) => {
      if (query.queryHash === failedLoad && query.state.fetchStatus === 'fetching') {
        setOpen(false)
      }
    })
  }, [queryClient, failedLoad])

  // Not on a click elsewhere: tapping back into quick-add to try again would hide the message before it's read
  function handleClose(_event: unknown, reason?: SnackbarCloseReason) {
    if (reason !== 'clickaway') {
      setOpen(false)
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* A failed load's toast stays, since nothing else on the page says why the data is missing */}
      <Snackbar open={open} autoHideDuration={failedLoad ? null : 6000} onClose={handleClose}>
        <Alert severity="error" variant="filled" onClose={handleClose}>
          {message}
        </Alert>
      </Snackbar>
    </QueryClientProvider>
  )
}
