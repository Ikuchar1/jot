import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { version } from 'uuid'
import { expect, test } from 'vitest'
import type { AddListRequest, TodoDto, TodoListDto } from '../api/generated/model'
import App from '../App'
import { renderWithProviders } from '../test/render'
import { server } from '../test/server'

const listsUrl = 'http://api.test/api/lists'
const todosUrl = 'http://api.test/api/todos'

const inbox: TodoListDto = { id: '0199e1c0-0000-7000-8000-000000000001', name: 'Inbox', isInbox: true, notDoneCount: 2 }
const work: TodoListDto = { id: '0199e1c0-0000-7000-8000-000000000002', name: 'Work', isInbox: false, notDoneCount: 1 }

const todo = (id: string, title: string, listId: string): TodoDto => ({ id, title, done: false, notes: null, listId })

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
