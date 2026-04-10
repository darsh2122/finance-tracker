// public/sw.js
self.addEventListener('push', (event) => {
    if (!event.data) return

    let data = {}
    try {
        data = event.data.json()
    } catch {
        data = { title: 'My Wallet', body: event.data.text() }
    }

    const {
        title = 'My Wallet',
        body = '',
        icon = 'pokYnDnWDsRyLUz.png',
        badge = 'pokYnDnWDsRyLUz.png',
        url = '/dashboard',
        tag = 'default',
        data: extraData = {},
    } = data

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,            // replaces previous notif with same tag
            renotify: true, // vibrate even when replacing same tag
            data: { url, ...extraData },
            actions: [
                { action: 'open', title: 'Open App' },
                { action: 'dismiss', title: 'Dismiss' },
            ],
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    if (event.action === 'dismiss') return

    const url = event.notification.data?.url || '/dashboard'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open, focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus()
                    client.navigate(url)
                    return
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(url)
            }
        })
    )
})

// Keep service worker alive (prevents Chrome from killing it mid-send)
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim())
})