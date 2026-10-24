import { apiData, contractClient } from '../../shared/api/http'
import type { components } from '../../shared/api/schema.generated'

export type AccountProfile = components['schemas']['AccountProfile']

export const accountApi = {
  profile: async () =>
    apiData(await contractClient.GET('/api/account/profile')),
  updateProfile: async (userName: string, email: string) =>
    apiData(await contractClient.PUT('/api/account/profile', { body: { userName, email } })),
  changePassword: async (currentPassword: string, newPassword: string) =>
    apiData(await contractClient.POST('/api/account/password', { body: { currentPassword, newPassword } })),
  sendVerification: async () =>
    apiData(await contractClient.POST('/api/account/verify-email/request')),
  verifyEmail: async (userId: string, token: string) =>
    apiData(await contractClient.POST('/api/account/verify-email', { body: { userId, token } })),
  forgotPassword: async (email: string) =>
    apiData(await contractClient.POST('/api/account/forgot-password', { body: { email } })),
  resetPassword: async (email: string, token: string, newPassword: string) =>
    apiData(await contractClient.POST('/api/account/reset-password', { body: { email, token, newPassword } }))
}
