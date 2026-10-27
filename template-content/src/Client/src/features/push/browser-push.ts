import { pushApi } from './push.api'
const optOutKey = 'mkx.push.optOut'
const supported = () => typeof window !== 'undefined' && window.isSecureContext &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const isOptedOut = () => { try { return localStorage.getItem(optOutKey) === '1' } catch { return false } }
const setOptOut = (value: boolean) => {
  try { if (value) localStorage.setItem(optOutKey, '1'); else localStorage.removeItem(optOutKey) } catch { /* Local storage may be blocked. */ }
}
const decodeKey = (key: string): Uint8Array<ArrayBuffer> => {
  const data = atob((key + '='.repeat((4 - key.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(data, char => char.charCodeAt(0))
}
const currentSubscription = async () => {
  if (!supported()) return null
  const registration = await navigator.serviceWorker.getRegistration('/')
  return registration?.pushManager.getSubscription() ?? null
}

export type PushState = { supported: boolean; subscribed: boolean; permission: NotificationPermission | 'unsupported' }
export const getPushState = async (): Promise<PushState> => {
  if (!supported()) return { supported: false, subscribed: false, permission: 'unsupported' }
  const subscription = await currentSubscription()
  return { supported: true, subscribed: !!subscription, permission: Notification.permission }
}
const subscribe = async (publicKey: string, ask: boolean): Promise<PushState> => {
  if (!supported() || (!ask && (Notification.permission !== 'granted' || isOptedOut()))) return getPushState()
  // Keep the permission prompt in the original user activation; never await a network request first.
  const permission = ask && Notification.permission === 'default'
    ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return { supported: true, permission, subscribed: false }
  const registration = await navigator.serviceWorker.getRegistration('/') ??
    await navigator.serviceWorker.register('/push-sw.js', { scope: '/', updateViaCache: 'none' })
  let subscription = await registration.pushManager.getSubscription()
  if (subscription?.options.applicationServerKey &&
      new Uint8Array(subscription.options.applicationServerKey).toString() !== decodeKey(publicKey).toString()) {
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) })
  const json = subscription.toJSON()
  if (!json.keys?.p256dh || !json.keys?.auth) throw new Error('Missing browser subscription keys.')
  await pushApi.register({
    endpoint: subscription.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
    deviceName: navigator.platform || 'Browser'
  })
  setOptOut(false)
  return { supported: true, subscribed: true, permission: 'granted' }
}
export const enablePush = (key: string) => subscribe(key, true)
let restoring: Promise<PushState> | null = null
export const restoreGrantedPush = (key: string) => {
  restoring ??= subscribe(key, false).finally(() => { restoring = null })
  return restoring
}
export const disablePush = async () => {
  setOptOut(true)
  const subscription = await currentSubscription()
  if (!subscription) return
  try { await pushApi.revoke(subscription.endpoint) }
  finally { await subscription.unsubscribe() }
}
export const detachPushOnLogout = async () => {
  try { await disablePush() }
  catch {
    const current = await currentSubscription().catch(() => null)
    await current?.unsubscribe().catch(() => false)
  }
}
