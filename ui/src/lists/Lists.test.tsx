import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { expect, test } from 'vitest'
import type { TodoDto, TodoListDto } from '../api/generated/model'
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
