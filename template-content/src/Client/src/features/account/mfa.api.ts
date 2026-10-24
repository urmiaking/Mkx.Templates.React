import { request } from '../../shared/api/http'

export type MfaStatus = { enabled: boolean; recoveryCodesLeft: number }
export type MfaSetup = { sharedKey: string; authenticatorUri: string }
export type MfaRecoveryCodes = { codes: string[] }

export const mfaApi = {
  status: () => request<MfaStatus>('/api/account/mfa/status'),
  setup: (currentPassword: string) => request<MfaSetup>('/api/account/mfa/setup',
    { method: 'POST', body: JSON.stringify({ currentPassword }) }),
  enable: (currentPassword: string, code: string) => request<MfaRecoveryCodes>('/api/account/mfa/enable',
    { method: 'POST', body: JSON.stringify({ currentPassword, code }) }),
  regenerate: (currentPassword: string, code: string) => request<MfaRecoveryCodes>('/api/account/mfa/recovery-codes',
    { method: 'POST', body: JSON.stringify({ currentPassword, code }) }),
  disable: (currentPassword: string, code: string) => request<void>('/api/account/mfa/disable',
    { method: 'POST', body: JSON.stringify({ currentPassword, code }) })
}
