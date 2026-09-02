// Lembretes de vacina por Web Push — funciona mesmo com o app fechado,
// diferente do lembrete que já existe dentro do próprio evento do Google
// Agenda (que só existe se o usuário sincronizou). Nível de conta, não de
// filho: um dispositivo assinado recebe lembretes de todos os filhos.

import { addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../firebase'

// A chave pública VAPID vem em base64url; a Push API espera um Uint8Array.
function base64UrlParaUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function statusNotificacoes() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'nao-suportado'
  if (Notification.permission === 'denied') return 'negado'
  if (Notification.permission !== 'granted') return 'pendente'

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? 'ativo' : 'pendente'
}

export async function ativarNotificacoes() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'nao-suportado'

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return 'negado'

  const registration = await navigator.serviceWorker.ready
  const chavePublica = base64UrlParaUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: chavePublica,
  })

  await addDoc(collection(db, 'criancas', auth.currentUser.uid, 'pushSubscriptions'), {
    ...subscription.toJSON(),
    userAgent: navigator.userAgent,
    criadoEm: new Date().toISOString(),
  })

  return 'ativo'
}
