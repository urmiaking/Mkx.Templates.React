import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disablePush, enablePush, restoreGrantedPush } from './browser-push'
import { pushApi } from './push.api'

vi.mock('./push.api', () => ({ pushApi: { register: vi.fn(), revoke: vi.fn() } }))
const mock = vi.mocked(pushApi)
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/device',
  options: {},
  toJSON: () => ({ keys: { p256dh: 'public', auth: 'secret' } }),
  unsubscribe: vi.fn(async () => true)
}
const getSubscription = vi.fn<() => Promise<typeof subscription | null>>()
const registration = { pushManager: { getSubscription, subscribe: vi.fn(async () => subscription) } }
const calls: string[] = []
const sw = {
  getRegistration: vi.fn(async () => { calls.push('lookup'); return registration }),
  register: vi.fn(async () => registration)
}
const requestPermission = vi.fn(async () => { calls.push('permission'); return 'granted' })
const notifications = { permission: 'default', requestPermission }

beforeEach(() => {
  vi.clearAllMocks()
  calls.length = 0
  getSubscription.mockResolvedValue(null)
  mock.register.mockResolvedValue(undefined)
  mock.revoke.mockResolvedValue(undefined)
  localStorage.clear()
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', notifications)
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw })
  notifications.permission = 'default'
})
describe('browser push', () => {
  it('requests permission from click before awaiting service-worker registration', async () => {
    const result = await enablePush('AA')
    expect(result.subscribed).toBe(true)
    expect(calls).toEqual(['permission', 'lookup'])
    expect(mock.register).toHaveBeenCalledWith(expect.objectContaining({ endpoint: subscription.endpoint }))
  })
  it('does not prompt when restoring a browser without granted permission', async () => {
    const result = await restoreGrantedPush('AA')
    expect(result.subscribed).toBe(false)
    expect(requestPermission).not.toHaveBeenCalled()
    expect(mock.register).not.toHaveBeenCalled()
  })
  it('revokes and unsubscribes the current device', async () => {
    getSubscription.mockResolvedValue(subscription)
    await disablePush()
    expect(mock.revoke).toHaveBeenCalledWith(subscription.endpoint)
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(localStorage.getItem('mkx.push.optOut')).toBe('1')
  })
})
