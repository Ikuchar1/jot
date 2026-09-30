import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* MUI's CSS reset, so every browser starts from the same styles */}
      <CssBaseline />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

const unusedOnPurpose = 1
