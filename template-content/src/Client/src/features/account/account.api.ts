import { request } from '../../shared/api/http'

export type AccountProfile = { userName: string; email: string | null; emailConfirmed: boolean }

export const accountApi = {
  profile: () => request<AccountProfile>('/api/account/profile'),
  updateProfile: (userName: string, email: string) =>
    request<AccountProfile>('/api/account/profile', { method: 'PUT', body: JSON.stringify({ userName, email }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/api/account/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  sendVerification: () => request<void>('/api/account/verify-email/request', { method: 'POST' }),
  verifyEmail: (userId: string, token: string) =>
    request<void>('/api/account/verify-email', { method: 'POST', body: JSON.stringify({ userId, token }) }),
  forgotPassword: (email: string) =>
    request<void>('/api/account/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, token: string, newPassword: string) =>
    request<void>('/api/account/reset-password', { method: 'POST', body: JSON.stringify({ email, token, newPassword }) })
}
