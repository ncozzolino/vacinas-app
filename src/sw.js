// Service worker próprio (em vez do gerado automaticamente pelo Workbox) —
// necessário pra lidar com o evento `push`, que o modo `generateSW` do
// vite-plugin-pwa não permite customizar.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('push', (event) => {
  const dados = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(dados.title || 'Caderneta Certa', {
      body: dados.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: dados.url || '/' },
    })
  )
})

// Ao tocar na notificação: foca uma aba já aberta do app, ou abre uma nova.
// Sem link por filho — a SPA não tem rotas, o usuário troca de filho pelo
// seletor já existente no topo do app depois de abrir.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      const aberta = lista.find((c) => c.url.startsWith(self.location.origin))
      return aberta ? aberta.focus() : self.clients.openWindow('/')
    })
  )
})
