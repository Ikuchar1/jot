import CssBaseline from '@mui/material/CssBaseline'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ApiProvider from './api/ApiProvider.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiProvider>
      {/* MUI's CSS reset, so every browser starts from the same styles */}
      <CssBaseline />
      <App />
    </ApiProvider>
  </StrictMode>,
)
