import createClient from 'openapi-fetch'
import type { paths } from './schema.generated'

export type ProblemDetails = { title?: string; detail?: string; status?: number }

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

async function antiforgeryToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', { credentials: 'include', cache: 'no-store' })
  if (!response.ok) throw new ApiError(response.status, 'امکان دریافت توکن امنیتی وجود ندارد.')
  const result = await response.json() as { token: string }
  return result.token
}

/** A single cookie-authenticated transport shared by manual requests and OpenAPI operations. */
export const fetchWithCsrf: typeof fetch = async (input, init) => {
  const outgoing = new Request(input, init)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(outgoing.method.toUpperCase())) {
    outgoing.headers.set('X-CSRF-TOKEN', await antiforgeryToken())
  }
  return fetch(outgoing, { credentials: 'include' })
}

async function parseApiError(response: Response): Promise<ApiError> {
  const problem = await response.clone().json().catch(() => null) as ProblemDetails | null
  return new ApiError(response.status, problem?.detail || problem?.title || 'خطایی در ارتباط با سرور رخ داد.')
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body != null && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetchWithCsrf(path, { ...options, headers })
  if (!response.ok) throw await parseApiError(response)
  return response.status === 204 ? undefined as T : await response.json() as T
}

/** Contract-driven paths and payloads share the same antiforgery/cookie policy. */
export const contractClient = createClient<paths>({
  baseUrl: window.location.origin,
  credentials: 'include',
  fetch: fetchWithCsrf
})

export async function apiData<T>(result: { data?: T; error?: unknown; response: Response }): Promise<T> {
  if (!result.response.ok) {
    // openapi-fetch consumes error bodies before returning { error, response }.
    const problem = result.error && typeof result.error === 'object' ? result.error as ProblemDetails : null
    throw new ApiError(result.response.status, problem?.detail || problem?.title || 'خطایی در ارتباط با سرور رخ داد.')
  }
  return result.data as T
}
