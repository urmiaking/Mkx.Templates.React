import { request } from '../../shared/api/http'

export type ExternalOidcStatus = {
  enabled: boolean
  displayName: string
  linked: boolean
}
export type ExternalOidcConfig = Pick<ExternalOidcStatus, 'enabled' | 'displayName'>

export const externalOidcApi = {
  config: () => request<ExternalOidcConfig>('/api/auth/external/config'),
  status: () => request<ExternalOidcStatus>('/api/account/external'),
  csrf: () => request<{ token: string }>('/api/auth/csrf'),
  unlink: (currentPassword: string) => request<void>('/api/account/external/unlink', {
    method: 'POST',
    body: JSON.stringify({ currentPassword })
  })
}
