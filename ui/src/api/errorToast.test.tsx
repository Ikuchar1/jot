import { act, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import { server } from '../test/server'
import TodosPage from '../todos/TodosPage'

// The Todos page is just something that calls the API; any failed call should end up in the toast
const todosUrl = 'http://api.test/api/todos'

afterEach(() => {
  vi.useRealTimers()
})

// Well past when a toast closes on its own, and its animation out
async function waitPastAutoClose() {
  await act(() => vi.advanceTimersByTimeAsync(10_000))
  await act(() => vi.advanceTimersByTimeAsync(1_000))
}

test("a quick-add the API turns down shows the API's reason in a toast", async () => {
  server.use(
    http.get(todosUrl, () => HttpResponse.json([])),
    http.post(todosUrl, () =>
      HttpResponse.json(
        { status: 400, title: 'Bad Request', detail: 'A todo needs a title.' },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')

  expect(await screen.findByRole('alert')).toHaveTextContent('A todo needs a title.')
})

test('a list that fails to load shows the problem in a toast', async () => {
  // What the API sends for an unhandled exception: a title, but no detail
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json(
        { status: 500, title: 'An error occurred while processing your request.' },
        { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    ),
  )
  renderWithProviders(<TodosPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('An error occurred while processing your request.')
})

test("an API that can't be reached shows a plain-words toast", async () => {
  server.use(http.get(todosUrl, () => HttpResponse.error()))
  renderWithProviders(<TodosPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach Jot. Check your connection and try again.")
})

test("an error that isn't problem details still shows a toast", async () => {
  // e.g. a proxy in front of the API answering with its own HTML page
  server.use(http.get(todosUrl, () => HttpResponse.html('<h1>502 Bad Gateway</h1>', { status: 502 })))
  renderWithProviders(<TodosPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong (error 502).')
})

test('clicking elsewhere on the page leaves the toast open', async () => {
  server.use(http.get(todosUrl, () => HttpResponse.error()))
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  const toast = await screen.findByRole('alert')

  // Like tapping back into quick-add to try again
  await user.click(screen.getByRole('textbox', { name: 'Add a todo' }))

  // A closing toast animates out in about 200ms
  await expect(waitForElementToBeRemoved(toast, { timeout: 500 })).rejects.toThrow()
})

test("a list that fails to load keeps its toast open, since nothing else on the page says why it's missing", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  server.use(http.get(todosUrl, () => HttpResponse.error()))
  renderWithProviders(<TodosPage />)
  await screen.findByRole('alert')

  await waitPastAutoClose()

  expect(screen.getByRole('alert')).toHaveTextContent("Can't reach Jot. Check your connection and try again.")
})

test('trying the list again closes its toast', async () => {
  server.use(
    http.get(todosUrl, () => HttpResponse.error(), { once: true }),
    http.get(todosUrl, () => delay('infinite')),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  const toast = await screen.findByRole('alert')

  await user.click(screen.getByRole('button', { name: 'Try again' }))

  // Its error is old news once the list is loading again
  await waitForElementToBeRemoved(toast)
})

test("a failed save's toast still closes on its own", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  server.use(
    http.get(todosUrl, () => HttpResponse.json([])),
    http.post(todosUrl, () => new HttpResponse(null, { status: 500 })),
  )
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  renderWithProviders(<TodosPage />)
  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')
  await screen.findByRole('alert')

  await waitPastAutoClose()

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
