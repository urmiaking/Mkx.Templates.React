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

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const headers = new Headers(options.headers)
  if (options.body != null && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (write) headers.set('X-CSRF-TOKEN', await antiforgeryToken())
  const response = await fetch(path, { ...options, method, headers, credentials: 'include' })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as ProblemDetails | null
    throw new ApiError(response.status, problem?.detail || problem?.title || 'خطایی در ارتباط با سرور رخ داد.')
  }
  return response.status === 204 ? undefined as T : await response.json() as T
}
