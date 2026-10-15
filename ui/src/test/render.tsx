import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import ApiProvider from '../api/ApiProvider'

// The app's own ApiProvider, so failed calls show their toast here too. A fresh cache per test so tests can't leak
// data into each other, and no retries so a failed request fails right away instead of after TanStack Query's back-off.
// A router in memory, starting at route, for anything that links or reads the URL
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <ApiProvider defaultOptions={{ queries: { retry: false }, mutations: { retry: false } }}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ApiProvider>,
  )
}
