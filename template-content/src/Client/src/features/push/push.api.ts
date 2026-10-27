import { apiData, contractClient } from '../../shared/api/http'

export const pushApi = {
  configuration: async () => apiData(await contractClient.GET('/api/push/configuration')),
  register: async (subscription: { endpoint: string; p256dh: string; auth: string; deviceName: string | null }) =>
    apiData(await contractClient.POST('/api/push/subscriptions', { body: subscription })),
  revoke: async (endpoint: string) =>
    apiData(await contractClient.DELETE('/api/push/subscriptions', { body: { endpoint } }))
}
