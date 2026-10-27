import { describe, expect, it } from 'vitest'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const worker = readFileSync(resolve(process.cwd(), 'public/push-sw.js'), 'utf8')
const createWorker = () => {
  const listeners = new Map<string, (event: unknown) => void>()
  const displayed: Array<{ title: string; options: { data: { url: string } } }> = []
  const navigated: string[] = []
  const tab = { navigate: async (url: string) => { navigated.push(url) }, focus: async () => true }
  const self = {
    location: { origin: 'https://app.test' },
    addEventListener: (name: string, callback: (event: unknown) => void) => listeners.set(name, callback),
    registration: { showNotification: async (title: string, options: { data: { url: string } }) => { displayed.push({ title, options }) } },
    clients: { matchAll: async () => [tab], openWindow: async (url: string) => { navigated.push(url) } }
  }
  vm.runInNewContext(worker, { self, URL })
  const dispatch = async (type: string, properties: object) => {
    const tasks: Array<Promise<unknown>> = []
    listeners.get(type)!({ ...properties, waitUntil: (task: Promise<unknown>) => tasks.push(task) })
    await Promise.all(tasks)
  }
  return { displayed, navigated, dispatch }
}
describe('push service worker', () => {
  it('shows notification and focuses same-origin route', async () => {
    const app = createWorker()
    await app.dispatch('push', { data: { json: () => ({ title: 'Message', url: '/work-items' }) } })
    expect(app.displayed[0].title).toBe('Message')
    expect(app.displayed[0].options.data.url).toBe('/work-items')
    await app.dispatch('notificationclick', { notification: { data: app.displayed[0].options.data, close() {} } })
    expect(app.navigated).toEqual(['/work-items'])
  })
  it('rejects navigation to another origin', async () => {
    const app = createWorker()
    await app.dispatch('push', { data: { json: () => ({ title: 'Message', url: '//attacker.invalid/path' }) } })
    expect(app.displayed[0].options.data.url).toBe('/')
  })
})
