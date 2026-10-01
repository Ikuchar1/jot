import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import ApiProvider from '../api/ApiProvider'

// The app's own ApiProvider, so failed calls show their toast here too. A fresh cache per test so tests can't leak
// data into each other, and no retries so a failed request fails right away instead of after TanStack Query's back-off
export function renderWithProviders(ui: ReactElement) {
  return render(
    <ApiProvider defaultOptions={{ queries: { retry: false }, mutations: { retry: false } }}>{ui}</ApiProvider>,
  )
}
