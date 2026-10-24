import { request } from '../../shared/api/http'

export type LoginResult = { requiresTwoFactor: true }
export type Session = { authenticated: boolean; email: string | null; userName: string | null; permissions: string[]; roles: string[] }

export const authApi = {
  me: () => request<Session>('/api/auth/me'),
  login: (userName: string, password: string) =>
    request<LoginResult | void>('/api/auth/login', { method: 'POST', body: JSON.stringify({ userName, password }) }),
  twoFactor: (code: string, useRecoveryCode: boolean) =>
    request<void>('/api/auth/2fa', { method: 'POST', body: JSON.stringify({ code, useRecoveryCode }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' })
}
