import type { ProblemDetails } from './generated/model'

// orval types every hook's error with this. Whatever error body an endpoint declares, jotFetch throws a plain Error
// whose message is ready to show.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- orval passes the error body's type; it isn't needed
export type ErrorType<_Body> = Error

// The one place the UI calls fetch — orval's generated hooks send every request through here.
// fetch doesn't reject on 4xx/5xx, so this throws instead; otherwise TanStack Query would treat
// an error response as success.
export async function jotFetch<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, options)
  } catch (error) {
    // fetch only rejects when no response came back at all, and each browser words that differently
    throw new Error("Can't reach Jot. Check your connection and try again.", { cause: error })
  }
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }

  const body = await response.text()
  return (body ? JSON.parse(body) : undefined) as T
}

// The API sends ProblemDetails for every error, but a proxy in front of it might not
async function errorMessage(response: Response) {
  const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined
  return problem?.detail ?? problem?.title ?? `Something went wrong (error ${response.status}).`
}
