import { act, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { version } from 'uuid'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type {
  AddTodoRequest,
  SetTodoDoneRequest,
  TodoDto,
  TodoListDto,
  UpdateTodoRequest,
} from '../api/generated/model'
import { renderWithProviders } from '../test/render'
import { server } from '../test/server'
import TodosPage from './TodosPage'

const todosUrl = 'http://api.test/api/todos'

const listsUrl = 'http://api.test/api/lists'
const inbox: TodoListDto = { id: '0199e1c0-0000-7000-8000-000000000001', name: 'Inbox', isInbox: true, notDoneCount: 0 }

// The page shows its list's name, so every test needs the lists
beforeEach(() => {
  server.use(http.get(listsUrl, () => HttpResponse.json([inbox])))
})

afterEach(() => {
  vi.useRealTimers()
})

test('shows the saved todos', async () => {
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk' },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist' },
      ]),
    ),
  )

  renderWithProviders(<TodosPage listId={inbox.id} />)

  expect(await screen.findByText('Buy milk')).toBeInTheDocument()
  expect(screen.getByText('Call the dentist')).toBeInTheDocument()
})

test('done todos wait in a collapsed Done section that opens when clicked', async () => {
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: true },
      ]),
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  expect(await screen.findByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  expect(screen.queryByText('Call the dentist')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /^Done/ }))

  expect(await screen.findByRole('checkbox', { name: 'Call the dentist' })).toBeChecked()
})

test('checking a todo moves it into Done right away and saves it as done', async () => {
  const sent: { id: string; done: boolean }[] = []
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false },
      ]),
    ),
    // The API never answers, so the todo can only move because the UI moved it optimistically
    http.put(`${todosUrl}/:id/done`, async ({ params, request }) => {
      const { done } = (await request.json()) as SetTodoDoneRequest
      sent.push({ id: params.id as string, done })
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('checkbox', { name: 'Buy milk' }))
  await user.click(screen.getByRole('button', { name: 'Done (1)' }))

  expect(await screen.findByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
  await waitFor(() => expect(sent).toEqual([{ id: '0199a5b2-0000-7000-8000-000000000001', done: true }]))
})

test('un-checking a done todo moves it back out of Done right away and saves it as not done', async () => {
  const sent: { id: string; done: boolean }[] = []
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: true },
      ]),
    ),
    http.put(`${todosUrl}/:id/done`, async ({ params, request }) => {
      const { done } = (await request.json()) as SetTodoDoneRequest
      sent.push({ id: params.id as string, done })
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Done (1)' }))
  await user.click(await screen.findByRole('checkbox', { name: 'Call the dentist' }))

  expect(screen.getByRole('checkbox', { name: 'Call the dentist' })).not.toBeChecked()
  // Nothing is done any more, so there's no Done section left for it to be in
  expect(screen.queryByRole('button', { name: /^Done/ })).not.toBeInTheDocument()
  await waitFor(() => expect(sent).toEqual([{ id: '0199a5b2-0000-7000-8000-000000000002', done: false }]))
})

test('a checked todo that fails to save snaps back', async () => {
  let failTheSave!: () => void
  const saveFails = new Promise<void>((resolve) => (failTheSave = resolve))
  server.use(
    http.get(
      todosUrl,
      () => HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }]),
      { once: true },
    ),
    // Offline, say: the reload after the save fails too, so only the UI can put the todo back
    http.get(todosUrl, () => HttpResponse.error()),
    http.put(`${todosUrl}/:id/done`, async () => {
      await saveFails
      return HttpResponse.error()
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('checkbox', { name: 'Buy milk' }))
  await screen.findByRole('button', { name: 'Done (1)' })
  failTheSave()

  expect(await screen.findByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  expect(screen.queryByRole('button', { name: /^Done/ })).not.toBeInTheDocument()
})

test('after an un-check saves, the todo moves to its place in the list', async () => {
  const buyMilk = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: true }
  const callTheDentist = { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false }
  server.use(
    // In the API's order: not-done todos oldest first, then done ones
    http.get(todosUrl, () => HttpResponse.json(buyMilk.done ? [callTheDentist, buyMilk] : [buyMilk, callTheDentist])),
    http.put(`${todosUrl}/:id/done`, () => {
      buyMilk.done = false
      return HttpResponse.json(buyMilk)
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Done (1)' }))
  await user.click(await screen.findByRole('checkbox', { name: 'Buy milk' }))

  // The UI doesn't sort, so it first puts it back at the bottom; the API knows where it goes
  await waitFor(() =>
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Buy milk', 'Call the dentist']),
  )
})

test('a check that saves while a quick-add is still saving keeps the new todo', async () => {
  const callTheDentist = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Call the dentist', done: false }
  server.use(
    http.get(todosUrl, () => HttpResponse.json([callTheDentist])),
    // The add never finishes, so a reload would come back without its todo
    http.post(todosUrl, () => delay('infinite')),
    http.put(`${todosUrl}/:id/done`, () => {
      callTheDentist.done = true
      return HttpResponse.json(callTheDentist)
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)
  const checkbox = await screen.findByRole('checkbox', { name: 'Call the dentist' })

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')
  await screen.findByText('Buy milk')
  await user.click(checkbox)

  // Watches for it going missing at any point, even before this line
  await expect(
    waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument(), { timeout: 500 }),
  ).rejects.toThrow()
})

test('a quick-add that saves while a check is still saving keeps the todo in Done', async () => {
  const saved: TodoDto[] = [
    {
      id: '0199a5b2-0000-7000-8000-000000000001',
      title: 'Call the dentist',
      done: false,
      notes: null,
      listId: inbox.id,
    },
  ]
  server.use(
    http.get(todosUrl, () => HttpResponse.json(saved)),
    http.post(todosUrl, async ({ request }) => {
      const { id, title } = (await request.json()) as AddTodoRequest
      const todo = { id: id!, title, done: false, notes: null, listId: inbox.id }
      saved.push(todo)
      return HttpResponse.json(todo, { status: 201 })
    }),
    // The check never finishes, so a reload would come back with the todo not done
    http.put(`${todosUrl}/:id/done`, () => delay('infinite')),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('checkbox', { name: 'Call the dentist' }))
  await screen.findByRole('button', { name: 'Done (1)' })
  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')

  // Watches for Done going missing at any point, even before this line
  await expect(
    waitFor(() => expect(screen.queryByRole('button', { name: /^Done/ })).not.toBeInTheDocument(), { timeout: 500 }),
  ).rejects.toThrow()
})

test('deleting a todo takes it off the page right away and deletes it', async () => {
  const deleted: string[] = []
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false },
      ]),
    ),
    // The API never answers, so the todo can only go because the UI took it off optimistically
    http.delete(`${todosUrl}/:id`, ({ params }) => {
      deleted.push(params.id as string)
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Buy milk' }))

  expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
  expect(screen.getByText('Call the dentist')).toBeInTheDocument()
  await waitFor(() => expect(deleted).toEqual(['0199a5b2-0000-7000-8000-000000000001']))
})

test('deleting a todo shows a Deleted toast with Undo that closes after about 5 seconds', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }]),
    ),
    http.delete(`${todosUrl}/:id`, () => new HttpResponse(null, { status: 204 })),
  )
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Buy milk' }))

  expect(await screen.findByText('Deleted')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(4_500))
  expect(screen.getByText('Deleted')).toBeInTheDocument()
  // Past 5 seconds, and its animation out
  await act(() => vi.advanceTimersByTimeAsync(1_000))
  await act(() => vi.advanceTimersByTimeAsync(1_000))
  expect(screen.queryByText('Deleted')).not.toBeInTheDocument()
})

test('Undo puts the deleted todo back in its place right away, restores it, and closes the toast', async () => {
  const buyMilk = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }
  const callTheDentist = { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false }
  const payRent = { id: '0199a5b2-0000-7000-8000-000000000003', title: 'Pay rent', done: false }
  const restored: string[] = []
  server.use(
    http.get(todosUrl, () => HttpResponse.json([buyMilk, callTheDentist, payRent]), { once: true }),
    // After the delete saves, the reload comes back without it
    http.get(todosUrl, () => HttpResponse.json([buyMilk, payRent])),
    http.delete(`${todosUrl}/:id`, () => new HttpResponse(null, { status: 204 })),
    // The API never answers, so the todo can only come back because the UI put it back optimistically
    http.post(`${todosUrl}/:id/restore`, ({ params }) => {
      restored.push(params.id as string)
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Call the dentist' }))
  await waitFor(() =>
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Buy milk', 'Pay rent']),
  )
  await user.click(screen.getByRole('button', { name: 'Undo' }))

  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Buy milk',
    'Call the dentist',
    'Pay rent',
  ])
  await waitFor(() => expect(restored).toEqual(['0199a5b2-0000-7000-8000-000000000002']))
  await waitFor(() => expect(screen.queryByText('Deleted')).not.toBeInTheDocument())
})

test('a done todo deleted from Done goes right away, and Undo puts it back in Done', async () => {
  const deleted: string[] = []
  const restored: string[] = []
  let saveTheDelete!: () => void
  const deleteSaves = new Promise<void>((resolve) => (saveTheDelete = resolve))
  const buyMilk = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }
  server.use(
    http.get(
      todosUrl,
      () =>
        HttpResponse.json([
          buyMilk,
          { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: true },
        ]),
      { once: true },
    ),
    // After the delete saves, a reload comes back without it
    http.get(todosUrl, () => HttpResponse.json([buyMilk])),
    // The delete answers only once the test lets it, and the restore never does, so only the UI moves the todo
    http.delete(`${todosUrl}/:id`, async ({ params }) => {
      deleted.push(params.id as string)
      await deleteSaves
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(`${todosUrl}/:id/restore`, ({ params }) => {
      restored.push(params.id as string)
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Done (1)' }))
  await user.click(await screen.findByRole('button', { name: 'Delete Call the dentist' }))

  expect(screen.queryByText('Call the dentist')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Done/ })).not.toBeInTheDocument()
  await waitFor(() => expect(deleted).toEqual(['0199a5b2-0000-7000-8000-000000000002']))
  saveTheDelete()

  await user.click(screen.getByRole('button', { name: 'Undo' }))
  await user.click(await screen.findByRole('button', { name: 'Done (1)' }))

  expect(await screen.findByRole('checkbox', { name: 'Call the dentist' })).toBeChecked()
  await waitFor(() => expect(restored).toEqual(['0199a5b2-0000-7000-8000-000000000002']))
})

test('a delete that fails to save puts back only its own todo, in its place', async () => {
  let failTheSave!: () => void
  const saveFails = new Promise<void>((resolve) => (failTheSave = resolve))
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false },
        { id: '0199a5b2-0000-7000-8000-000000000003', title: 'Pay rent', done: false },
      ]),
    ),
    http.delete(`${todosUrl}/:id`, async ({ params }) => {
      // Pay rent's delete is still saving when Buy milk's fails
      if (params.id === '0199a5b2-0000-7000-8000-000000000003') return delay('infinite')
      await saveFails
      return HttpResponse.error()
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Buy milk' }))
  await user.click(screen.getByRole('button', { name: 'Delete Pay rent' }))
  failTheSave()

  expect(await screen.findByText("Can't reach Jot. Check your connection and try again.")).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Buy milk', 'Call the dentist']),
  )
})

test('a delete that fails to save closes its Deleted toast, since there is nothing to undo', async () => {
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }]),
    ),
    http.delete(`${todosUrl}/:id`, () => HttpResponse.error()),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Buy milk' }))

  expect(await screen.findByText("Can't reach Jot. Check your connection and try again.")).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument())
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})

test('a delete that fails after its Undo was tapped shows the todo once', async () => {
  const buyMilk = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }
  const callTheDentist = { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false }
  let failTheDelete!: () => void
  const deleteFails = new Promise<void>((resolve) => (failTheDelete = resolve))
  // The restore stays saving, so no reload can tidy the list up and only the UI decides what shows
  let saveTheRestore!: () => void
  const restoreSaves = new Promise<void>((resolve) => (saveTheRestore = resolve))
  server.use(
    http.get(todosUrl, () => HttpResponse.json([buyMilk, callTheDentist])),
    http.delete(`${todosUrl}/:id`, async () => {
      await deleteFails
      return HttpResponse.error()
    }),
    http.post(`${todosUrl}/:id/restore`, async () => {
      await restoreSaves
      return HttpResponse.json(callTheDentist)
    }),
  )
  const consoleError = vi.spyOn(console, 'error')
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Call the dentist' }))
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  failTheDelete()

  expect(await screen.findByText("Can't reach Jot. Check your connection and try again.")).toBeInTheDocument()
  expect(consoleError.mock.calls.flat().join(' ')).not.toContain('same key')
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Buy milk', 'Call the dentist'])
  consoleError.mockRestore()
  saveTheRestore()
})

test('Undo tapped while the delete is still saving leaves the todo restored', async () => {
  const buyMilk = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }
  const callTheDentist = { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false }
  // A fake API that applies each request when it arrives
  let deleted = false
  let applied = 0
  let reloadsAfterBoth = 0
  let restoreArrived!: () => void
  const restoreHasArrived = new Promise<void>((resolve) => (restoreArrived = resolve))
  server.use(
    http.get(todosUrl, () => {
      if (applied === 2) reloadsAfterBoth++
      return HttpResponse.json(deleted ? [buyMilk] : [buyMilk, callTheDentist])
    }),
    // A slow delete: it lands after the restore if the restore is sent without waiting for it
    http.delete(`${todosUrl}/:id`, async () => {
      await Promise.race([restoreHasArrived, delay(300)])
      deleted = true
      applied++
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(`${todosUrl}/:id/restore`, () => {
      restoreArrived()
      deleted = false
      applied++
      return HttpResponse.json(callTheDentist)
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Call the dentist' }))
  await user.click(screen.getByRole('button', { name: 'Undo' }))

  // Once both have saved, the page shows what the API ended up with
  await waitFor(() => expect(reloadsAfterBoth).toBeGreaterThan(0), { timeout: 2000 })
  await waitFor(() =>
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Buy milk', 'Call the dentist']),
  )
})

test('deleting a todo again after its Undo, while the first delete is still saving, leaves it deleted', async () => {
  const buyMilk = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }
  const callTheDentist = { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false }
  // A fake API that applies each request when it arrives
  let deleted = false
  const applied: string[] = []
  let firstDelete = true
  let saveTheFirstDelete!: () => void
  const firstDeleteSaves = new Promise<void>((resolve) => (saveTheFirstDelete = resolve))
  server.use(
    http.get(todosUrl, () => HttpResponse.json(deleted ? [buyMilk] : [buyMilk, callTheDentist])),
    http.delete(`${todosUrl}/:id`, async () => {
      if (firstDelete) {
        firstDelete = false
        await firstDeleteSaves
      }
      deleted = true
      applied.push('delete')
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(`${todosUrl}/:id/restore`, () => {
      deleted = false
      applied.push('restore')
      return HttpResponse.json(callTheDentist)
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Call the dentist' }))
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  await user.click(await screen.findByRole('button', { name: 'Delete Call the dentist' }))
  saveTheFirstDelete()

  // The API gets them in the order they were tapped, so the last one, the delete, wins
  await waitFor(() => expect(applied).toEqual(['delete', 'restore', 'delete']), { timeout: 2000 })
  expect(deleted).toBe(true)
  await waitFor(() => expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Buy milk']))
})

test('an Undo that fails to save takes the todo back out', async () => {
  const buyMilk = { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk', done: false }
  const callTheDentist = { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Call the dentist', done: false }
  let failTheSave!: () => void
  const saveFails = new Promise<void>((resolve) => (failTheSave = resolve))
  server.use(
    http.get(todosUrl, () => HttpResponse.json([buyMilk, callTheDentist]), { once: true }),
    http.get(todosUrl, () => HttpResponse.json([buyMilk]), { once: true }),
    // Offline, say: the reload after the Undo fails too, so only the UI can take the todo back out
    http.get(todosUrl, () => HttpResponse.error()),
    http.delete(`${todosUrl}/:id`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${todosUrl}/:id/restore`, async () => {
      await saveFails
      return HttpResponse.error()
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Delete Call the dentist' }))
  await waitFor(() => expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Buy milk']))
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  const todo = await screen.findByText('Call the dentist')
  failTheSave()

  await waitForElementToBeRemoved(todo)
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})

test('shows a spinner until the todos load', async () => {
  server.use(
    http.get(todosUrl, () => HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Buy milk' }])),
  )

  renderWithProviders(<TodosPage listId={inbox.id} />)

  await waitForElementToBeRemoved(screen.getByRole('progressbar', { name: 'Loading todos' }))
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})

test('once loading the todos gives up, Try again replaces the spinner', async () => {
  server.use(http.get(todosUrl, () => HttpResponse.error()))

  renderWithProviders(<TodosPage listId={inbox.id} />)

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
  renderWithProviders(<TodosPage listId={inbox.id} />)

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
  renderWithProviders(<TodosPage listId={inbox.id} />)
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
  renderWithProviders(<TodosPage listId={inbox.id} />)
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
  renderWithProviders(<TodosPage listId={inbox.id} />)

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
  renderWithProviders(<TodosPage listId={inbox.id} />)
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
  renderWithProviders(<TodosPage listId={inbox.id} />)

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
  renderWithProviders(<TodosPage listId={inbox.id} />)
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
  renderWithProviders(<TodosPage listId={inbox.id} />)

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
  renderWithProviders(<TodosPage listId={inbox.id} />)
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
      const { id, title } = (await request.json()) as AddTodoRequest
      const todo = { id: id!, title, done: false, notes: null, listId: inbox.id }
      // Meanwhile another caller (Siri, say) added one too
      saved.push(
        {
          id: '0199a5b2-0000-7000-8000-000000000001',
          title: 'Call the dentist',
          done: false,
          notes: null,
          listId: inbox.id,
        },
        todo,
      )
      return HttpResponse.json(todo, { status: 201 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Buy milk{Enter}')

  expect(await screen.findByText('Call the dentist')).toBeInTheDocument()
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})

test("tapping a todo's title opens the editor with its title and notes filled in", async () => {
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'History essay', done: false, notes: 'Chapter 4 to 6' },
      ]),
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'History essay' }))

  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  expect(within(editor).getByRole('textbox', { name: 'Title' })).toHaveValue('History essay')
  expect(within(editor).getByRole('textbox', { name: 'Notes' })).toHaveValue('Chapter 4 to 6')
})

test('saving an edit closes the editor, shows the new title right away, and saves the title and notes', async () => {
  const sent: { id: string; body: UpdateTodoRequest }[] = []
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Essay', done: false, notes: null }]),
    ),
    // The API never answers, so the new title can only show because the UI changed it optimistically
    http.put(`${todosUrl}/:id`, async ({ params, request }) => {
      sent.push({ id: params.id as string, body: (await request.json()) as UpdateTodoRequest })
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Essay' }))
  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  await user.clear(within(editor).getByRole('textbox', { name: 'Title' }))
  await user.type(within(editor).getByRole('textbox', { name: 'Title' }), 'History essay')
  await user.type(within(editor).getByRole('textbox', { name: 'Notes' }), 'Due Friday')
  await user.click(within(editor).getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit todo' })).not.toBeInTheDocument())
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['History essay'])
  await waitFor(() =>
    expect(sent).toEqual([
      { id: '0199a5b2-0000-7000-8000-000000000001', body: { title: 'History essay', notes: 'Due Friday' } },
    ]),
  )
})

test('clearing the notes and saving saves the todo with no notes', async () => {
  const sent: UpdateTodoRequest[] = []
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Essay', done: false, notes: 'Due Friday' },
      ]),
    ),
    http.put(`${todosUrl}/:id`, async ({ request }) => {
      sent.push((await request.json()) as UpdateTodoRequest)
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Essay' }))
  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  await user.clear(within(editor).getByRole('textbox', { name: 'Notes' }))
  await user.click(within(editor).getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(sent).toEqual([{ title: 'Essay', notes: null }]))
})

test("Save is disabled while the editor's title is blank, so a blank title can't be saved", async () => {
  const sent: UpdateTodoRequest[] = []
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Essay', done: false, notes: null }]),
    ),
    http.put(`${todosUrl}/:id`, async ({ request }) => {
      sent.push((await request.json()) as UpdateTodoRequest)
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Essay' }))
  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  const title = within(editor).getByRole('textbox', { name: 'Title' })
  await user.clear(title)
  expect(within(editor).getByRole('button', { name: 'Save' })).toBeDisabled()
  await user.type(title, '   {Enter}')

  expect(within(editor).getByRole('button', { name: 'Save' })).toBeDisabled()
  expect(screen.getByRole('dialog', { name: 'Edit todo' })).toBeInTheDocument()
  // Give a request that shouldn't have been sent time to arrive
  await expect(waitFor(() => expect(sent).not.toEqual([]), { timeout: 300 })).rejects.toThrow()
})

test('Cancel closes the editor without saving', async () => {
  // No PUT handler: a save would fail the test
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Essay', done: false, notes: null }]),
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Essay' }))
  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  await user.type(within(editor).getByRole('textbox', { name: 'Title' }), ' draft')
  await user.click(within(editor).getByRole('button', { name: 'Cancel' }))

  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit todo' })).not.toBeInTheDocument())
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Essay'])
})

test("tapping a todo's checkbox or delete button doesn't open the editor", async () => {
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Essay', done: false, notes: null },
        { id: '0199a5b2-0000-7000-8000-000000000002', title: 'Lab report', done: false, notes: null },
      ]),
    ),
    http.put(`${todosUrl}/:id/done`, () => delay('infinite')),
    http.delete(`${todosUrl}/:id`, () => delay('infinite')),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)
  const checkbox = await screen.findByRole('checkbox', { name: 'Essay' })
  // Checking or deleting a todo takes it out of the list, which would close an editor it opened, so this watches for
  // one opening at any point
  let editorOpened = false
  const observer = new MutationObserver((records) => {
    const added = records.flatMap((record) => [...record.addedNodes]).filter((node) => node instanceof Element)
    editorOpened ||= added.some((node) => node.matches('[role="dialog"]') || node.querySelector('[role="dialog"]'))
  })
  observer.observe(document.body, { childList: true, subtree: true })

  await user.click(checkbox)
  await user.click(screen.getByRole('button', { name: 'Delete Lab report' }))
  await waitFor(() => expect(screen.queryByText('Lab report')).not.toBeInTheDocument())
  observer.disconnect()

  expect(editorOpened).toBe(false)
})

test('an edit that fails to save puts back the todo as it was', async () => {
  let failTheSave!: () => void
  const saveFails = new Promise<void>((resolve) => (failTheSave = resolve))
  server.use(
    http.get(
      todosUrl,
      () =>
        HttpResponse.json([{ id: '0199a5b2-0000-7000-8000-000000000001', title: 'Essay', done: false, notes: null }]),
      { once: true },
    ),
    // Offline, say: the reload after the save fails too, so only the UI can put the old title back
    http.get(todosUrl, () => HttpResponse.error()),
    http.put(`${todosUrl}/:id`, async () => {
      await saveFails
      return HttpResponse.error()
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Essay' }))
  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  await user.type(within(editor).getByRole('textbox', { name: 'Title' }), ' draft')
  await user.click(within(editor).getByRole('button', { name: 'Save' }))
  await screen.findByText('Essay draft')
  failTheSave()

  expect(await screen.findByText("Can't reach Jot. Check your connection and try again.")).toBeInTheDocument()
  await waitFor(() => expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Essay']))
})

test('a todo in Done can be opened and edited too', async () => {
  const sent: UpdateTodoRequest[] = []
  server.use(
    http.get(todosUrl, () =>
      HttpResponse.json([
        { id: '0199a5b2-0000-7000-8000-000000000001', title: 'Essay', done: true, notes: 'Handed in' },
      ]),
    ),
    http.put(`${todosUrl}/:id`, async ({ request }) => {
      sent.push((await request.json()) as UpdateTodoRequest)
      return delay('infinite')
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<TodosPage listId={inbox.id} />)

  await user.click(await screen.findByRole('button', { name: 'Done (1)' }))
  await user.click(await screen.findByRole('button', { name: 'Essay' }))
  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  expect(within(editor).getByRole('textbox', { name: 'Notes' })).toHaveValue('Handed in')
  await user.type(within(editor).getByRole('textbox', { name: 'Title' }), ' (history)')
  await user.click(within(editor).getByRole('button', { name: 'Save' }))

  expect(await screen.findByRole('checkbox', { name: 'Essay (history)' })).toBeChecked()
  await waitFor(() => expect(sent).toEqual([{ title: 'Essay (history)', notes: 'Handed in' }]))
})
