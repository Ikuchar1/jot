import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { version } from 'uuid'
import { expect, test } from 'vitest'
import type { AddTodoRequest, TodoDto } from '../api/generated/model'
import { renderWithProviders } from '../test/render'
import { server } from '../test/server'
import TodosPage from './TodosPage'

const todosUrl = 'http://api.test/api/todos'

test('shows the saved todos', async () => {
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk' },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist' },
      ]),
    ),
  )

  renderWithProviders(<TodosPage />)

  expect(await screen.findByText('Buy milk')).toBeInTheDocument()
  expect(screen.getByText('Call the dentist')).toBeInTheDocument()
})

test('shows a spinner until the todos load', async () => {
  server.use(
    http.get(todosUrl, () => HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk' }])),
  )

  renderWithProviders(<TodosPage />)

  await waitForElementToBeRemoved(screen.getByRole('progressbar', { name: 'Loading todos' }))
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})

test('once loading the todos gives up, Try again replaces the spinner', async () => {
  server.use(http.get(todosUrl, () => HttpResponse.error()))

  renderWithProviders(<TodosPage />)

  // The toast says why; a spinner that kept going would say it's still trying
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(screen.queryByRole('progressbar', { name: 'Loading todos' })).not.toBeInTheDocument()
})

test('Try again shows the spinner until the todos load', async () => {
  let answer!: () => void
  const answered = new Promise<void>((resolve) => (answer = resolve))
  server.use(
    // The first load fails, and the next one waits until the test lets it answer
    http.get(todosUrl, () => HttpResponse.error(), { once: true }),
    http.get(todosUrl, async () => {
      await answered
      return HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk' }])
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)

  await user.click(await screen.findByRole('button', { name: 'Try again' }))
  const spinner = await screen.findByRole('progressbar', { name: 'Loading todos' })
  answer()

  await waitForElementToBeRemoved(spinner)
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})

test('Try again comes back when a quick-add fails before the todos could load', async () => {
  let failTheSave!: () => void
  const saveFails = new Promise<void>((resolve) => (failTheSave = resolve))
  server.use(
    http.get(todosUrl, () => HttpResponse.error()),
    http.post(todosUrl, async () => {
      await saveFails
      return HttpResponse.error()
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  await screen.findByRole('button', { name: 'Try again' })

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')
  await screen.findByText('Buy milk')
  failTheSave()

  // The add is taken back out and the reload after it fails too, so an empty list would look like there are no todos
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
})

test('todos that loaded stay when a later reload fails', async () => {
  server.use(
    http.get(
      todosUrl,
      () => HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Call the dentist' }]),
      { once: true },
    ),
    http.get(todosUrl, () => HttpResponse.error()),
    http.post(todosUrl, () => new HttpResponse(null, { status: 500 })),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  await screen.findByText('Call the dentist')

  // The add fails, and so does the reload of the list that follows it
  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')
  await screen.findByText("Can't reach Jot. Check your connection and try again.")

  await expect(screen.findByRole('button', { name: 'Try again' }, { timeout: 500 })).rejects.toThrow()
  expect(screen.getByText('Call the dentist')).toBeInTheDocument()
})

test('quick-add saves the todo with a UUID v7 the UI created', async () => {
  const sent: AddTodoRequest[] = []
  server.use(
    http.get(todosUrl, () => HttpResponse.json([])),
    http.post(todosUrl, async ({ request }) => {
      const body = (await request.json()) as AddTodoRequest
      sent.push(body)
      return HttpResponse.json(body, { status: 201 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')

  await waitFor(() => expect(sent).toHaveLength(1))
  expect(sent[0].title).toBe('Buy milk')
  expect(version(sent[0].id!)).toBe(7)
})

test("quick-add doesn't send a blank title", async () => {
  const sent: AddTodoRequest[] = []
  server.use(
    http.get(todosUrl, () => HttpResponse.json([])),
    http.post(todosUrl, async ({ request }) => {
      const body = (await request.json()) as AddTodoRequest
      sent.push(body)
      return HttpResponse.json(body, { status: 201 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  const quickAdd = screen.getByRole('textbox', { name: 'Add a todo' })

  await user.type(quickAdd, '   {Enter}')
  await user.clear(quickAdd)
  await user.type(quickAdd, 'Buy milk{Enter}')

  // Had the blank been sent, it would be first
  await waitFor(() => expect(sent).toHaveLength(1))
  expect(sent[0].title).toBe('Buy milk')
})

test("quick-add doesn't suggest what was typed before", () => {
  server.use(http.get(todosUrl, () => HttpResponse.json([])))
  renderWithProviders(<TodosPage />)

  // The browser's suggestions, which it saves from every submitted form
  expect(screen.getByRole('textbox', { name: 'Add a todo' })).toHaveAttribute('autocomplete', 'off')
})

test('a quick-added todo shows up before the API answers', async () => {
  server.use(
    http.get(todosUrl, () => HttpResponse.json([])),
    // The API never answers, so the todo can only be showing because the UI added it optimistically
    http.post(todosUrl, () => delay('infinite')),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  const quickAdd = screen.getByRole('textbox', { name: 'Add a todo' })

  await user.type(quickAdd, 'Buy milk{Enter}')

  expect(await screen.findByText('Buy milk')).toBeInTheDocument()
  expect(quickAdd).toHaveValue('')
})

test('a quick-added todo that fails to save is taken back out', async () => {
  let failTheSave!: () => void
  const saveFails = new Promise<void>((resolve) => (failTheSave = resolve))
  server.use(
    http.get(todosUrl, () => HttpResponse.json([])),
    http.post(todosUrl, async () => {
      await saveFails
      return new HttpResponse(null, { status: 500 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')
  const todo = await screen.findByText('Buy milk')
  failTheSave()

  await waitForElementToBeRemoved(todo)
})

test('a failed quick-add takes out only its own todo, not one still saving', async () => {
  let failTheSave!: () => void
  const saveFails = new Promise<void>((resolve) => (failTheSave = resolve))
  server.use(
    http.get(todosUrl, () => HttpResponse.json([])),
    http.post(todosUrl, async ({ request }) => {
      const { title } = (await request.json()) as AddTodoRequest
      if (title === 'Call the dentist') return delay('infinite')
      await saveFails
      return new HttpResponse(null, { status: 500 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)
  const quickAdd = screen.getByRole('textbox', { name: 'Add a todo' })

  await user.type(quickAdd, 'Buy milk{Enter}')
  await user.type(quickAdd, 'Call the dentist{Enter}')
  const failed = await screen.findByText('Buy milk')
  expect(await screen.findByText('Call the dentist')).toBeInTheDocument()
  failTheSave()

  await waitForElementToBeRemoved(failed)
  expect(screen.getByText('Call the dentist')).toBeInTheDocument()
})

test('after a quick-add saves, the list catches up with the API', async () => {
  const saved: TodoDto[] = []
  server.use(
    http.get(todosUrl, () => HttpResponse.json(saved)),
    http.post(todosUrl, async ({ request }) => {
      const todo = (await request.json()) as TodoDto
      // Meanwhile another caller (Siri, say) added one too
      saved.push({ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Call the dentist' }, todo)
      return HttpResponse.json(todo, { status: 201 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage />)

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')

  expect(await screen.findByText('Call the dentist')).toBeInTheDocument()
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})
