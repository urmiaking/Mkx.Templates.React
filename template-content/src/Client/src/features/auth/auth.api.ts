import { request } from '../../shared/api/http'

export type Session = { authenticated: boolean; email: string | null; permissions: string[]; roles: string[] }

export const authApi = {
  me: () => request<Session>('/api/auth/me'),
  login: (email: string, password: string) =>
    request<void>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' })
}
