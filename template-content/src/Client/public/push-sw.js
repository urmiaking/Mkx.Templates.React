/* global self, URL */
/* Push-only worker: never caches HTML, credentials, API data or static content. */
const sameOriginPath = value => {
    try {
        const url = new URL(typeof value === 'string' ? value : '/', self.location.origin)
        return url.origin === self.location.origin ? url.pathname + url.search + url.hash : '/'
    } catch { return '/' }
}
self.addEventListener('push', event => {
    let payload = {}
    try { payload = event.data?.json() ?? {} } catch { /* No payload is a valid notification. */ }
    const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title : 'اعلان جدید'
    event.waitUntil(self.registration.showNotification(title, {
        body: typeof payload.body === 'string' ? payload.body : '',
        tag: typeof payload.tag === 'string' ? payload.tag : undefined,
        icon: '/icon.svg', data: { url: sameOriginPath(payload.url) }
    }))
})
self.addEventListener('notificationclick', event => {
    event.notification.close()
    const path = sameOriginPath(event.notification.data?.url)
    event.waitUntil((async () => {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const client of clients) {
            if (typeof client.navigate === 'function') await client.navigate(path)
            if (typeof client.focus === 'function') return client.focus()
        }
        return self.clients.openWindow(path)
    })())
})
