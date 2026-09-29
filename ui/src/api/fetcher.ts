// The one place the UI calls fetch — orval's generated hooks send every request through here.
// fetch doesn't reject on 4xx/5xx, so this throws instead; otherwise TanStack Query would treat
// an error response as success.
export async function jotFetch<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, options)
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url} failed with status ${response.status}`)
  }

  const body = await response.text()
  return (body ? JSON.parse(body) : undefined) as T
}
