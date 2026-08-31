// Configuração do Firebase — as chaves vêm de variáveis de ambiente (.env),
// nunca hardcoded. Ver .env.example para a lista de variáveis necessárias.
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Escopo do Google Calendar solicitado já no login com Google,
// pra não precisar de uma segunda autorização depois.
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events')

// O access token do Google só vem no retorno de um popup e não é persistido
// entre recarregamentos — quando ele expira ou some (ex: usuário voltou ao
// app depois de um tempo), pedimos um novo. Se a conta já logou com Google,
// usamos reautenticação (mantém o mesmo uid); se logou com e-mail/senha e
// nunca conectou o Google, vinculamos a conta do Google à conta existente
// (também mantém o mesmo uid — nunca troca de usuário).
export async function obterAccessTokenGoogle() {
  const jaTemGoogle = auth.currentUser?.providerData.some((p) => p.providerId === 'google.com')
  const result = jaTemGoogle
    ? await reauthenticateWithPopup(auth.currentUser, googleProvider)
    : await linkWithPopup(auth.currentUser, googleProvider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  return credential?.accessToken || null
}
