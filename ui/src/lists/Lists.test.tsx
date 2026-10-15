import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { version } from 'uuid'
import { expect, test } from 'vitest'
import type {
  AddListRequest,
  AddTodoRequest,
  SetTodoDoneRequest,
  TodoDto,
  TodoListDto,
  UpdateTodoRequest,
} from '../api/generated/model'
import App from '../App'
import { renderWithProviders } from '../test/render'
import { server } from '../test/server'

const listsUrl = 'http://api.test/api/lists'
const todosUrl = 'http://api.test/api/todos'

const inbox: TodoListDto = { id: '0199e1c0-0000-7000-8000-000000000001', name: 'Inbox', isInbox: true, notDoneCount: 2 }
const work: TodoListDto = { id: '0199e1c0-0000-7000-8000-000000000002', name: 'Work', isInbox: false, notDoneCount: 1 }

const todo = (id: string, title: string, listId: string): TodoDto => ({ id, title, done: false, notes: null, listId })

// An API that keeps what it's sent, for the Inbox and Work, and counts their not-done todos when the lists are loaded
function fakeApi(todos: TodoDto[]) {
  const deleted: TodoDto[] = []
  const count = (listId: string) => todos.filter((t) => t.listId === listId && !t.done).length
  server.use(
    http.get(listsUrl, () =>
      HttpResponse.json([inbox, work].map((list) => ({ ...list, notDoneCount: count(list.id) }))),
    ),
    http.get(todosUrl, ({ request }) =>
      HttpResponse.json(todos.filter((t) => t.listId === new URL(request.url).searchParams.get('listId'))),
    ),
    http.post(todosUrl, async ({ request }) => {
      const { id, title, listId } = (await request.json()) as AddTodoRequest
      const added = todo(id!, title, listId!)
      todos.push(added)
      return HttpResponse.json(added, { status: 201 })
    }),
    http.put(`${todosUrl}/:id/done`, async ({ params, request }) => {
      const changed = todos.find((t) => t.id === params.id)!
      changed.done = ((await request.json()) as SetTodoDoneRequest).done
      return HttpResponse.json(changed)
    }),
    http.put(`${todosUrl}/:id`, async ({ params, request }) => {
      const changed = todos.find((t) => t.id === params.id)!
      Object.assign(changed, (await request.json()) as UpdateTodoRequest)
      return HttpResponse.json(changed)
    }),
    http.delete(`${todosUrl}/:id`, ({ params }) => {
      deleted.push(
        ...todos.splice(
          todos.findIndex((t) => t.id === params.id),
          1,
        ),
      )
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(`${todosUrl}/:id/restore`, ({ params }) => {
      const restored = deleted.splice(
        deleted.findIndex((t) => t.id === params.id),
        1,
      )[0]
      todos.push(restored)
      return HttpResponse.json(restored)
    }),
  )
}

// The count beside a list in the sidebar
const countOf = (name: string) => {
  const link = within(screen.getByRole('navigation', { name: 'Lists' })).getByRole('link', { name: new RegExp(name) })
  return within(link).getByText(/^\d+$/).textContent
}

test('the app opens on the Inbox, and the sidebar shows every list with its not-done count', async () => {
  server.use(
    http.get(listsUrl, () => HttpResponse.json([inbox, work])),
    http.get(todosUrl, ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('listId') === inbox.id
          ? [todo('0199a5b2-0000-7000-8000-000000000001', 'Buy milk', inbox.id)]
          : [],
      ),
    ),
  )
  renderWithProviders(<App />)

  expect(await screen.findByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
  expect(await screen.findByText('Buy milk')).toBeInTheDocument()
  const sidebar = screen.getByRole('navigation', { name: 'Lists' })
  expect(within(within(sidebar).getByRole('link', { name: /Inbox/ })).getByText('2')).toBeInTheDocument()
  expect(within(within(sidebar).getByRole('link', { name: /Work/ })).getByText('1')).toBeInTheDocument()
})

test('creating a list adds it to the sidebar, and clicking it opens its page with only its todos', async () => {
  const lists = [inbox]
  const sent: AddListRequest[] = []
  const todos = [
    todo('0199a5b2-0000-7000-8000-000000000001', 'Buy milk', inbox.id),
    todo('0199a5b2-0000-7000-8000-000000000002', 'Eggs', '0199e1c0-0000-7000-8000-000000000003'),
  ]
  server.use(
    http.get(listsUrl, () => HttpResponse.json(lists)),
    http.post(listsUrl, async ({ request }) => {
      const body = (await request.json()) as AddListRequest
      sent.push(body)
      // The ID the Eggs todo is already on, so its page has something to show
      const list = { id: '0199e1c0-0000-7000-8000-000000000003', name: body.name, isInbox: false, notDoneCount: 1 }
      lists.push(list)
      return HttpResponse.json(list, { status: 201 })
    }),
    http.get(todosUrl, ({ request }) =>
      HttpResponse.json(todos.filter((t) => t.listId === new URL(request.url).searchParams.get('listId'))),
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<App />)
  await screen.findByText('Buy milk')

  await user.click(screen.getByRole('button', { name: 'New list' }))
  const dialog = await screen.findByRole('dialog', { name: 'New list' })
  await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Groceries')
  await user.click(within(dialog).getByRole('button', { name: 'Create' }))

  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New list' })).not.toBeInTheDocument())
  const sidebar = screen.getByRole('navigation', { name: 'Lists' })
  await user.click(await within(sidebar).findByRole('link', { name: /Groceries/ }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Groceries' })).toBeInTheDocument()
  expect(await screen.findByText('Eggs')).toBeInTheDocument()
  expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
  expect(sent).toHaveLength(1)
  expect(sent[0].name).toBe('Groceries')
  expect(version(sent[0].id!)).toBe(7)
})

test("the sidebar's counts catch up after adding, checking and moving a todo", async () => {
  fakeApi([todo('0199a5b2-0000-7000-8000-000000000001', 'Buy milk', inbox.id)])
  const user = userEvent.setup()
  renderWithProviders(<App />)
  await screen.findByText('Buy milk')
  expect(countOf('Inbox')).toBe('1')

  await user.type(screen.getByRole('textbox', { name: 'Add a todo' }), 'Call the dentist{Enter}')
  await waitFor(() => expect(countOf('Inbox')).toBe('2'))

  await user.click(screen.getByRole('checkbox', { name: 'Buy milk' }))
  await waitFor(() => expect(countOf('Inbox')).toBe('1'))

  await user.click(screen.getByRole('button', { name: 'Call the dentist' }))
  const editor = await screen.findByRole('dialog', { name: 'Edit todo' })
  await user.click(within(editor).getByRole('combobox', { name: 'List' }))
  await user.click(await screen.findByRole('option', { name: 'Work' }))
  await user.click(within(editor).getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(countOf('Inbox')).toBe('0'))
  expect(countOf('Work')).toBe('1')
})
