// Registro de eventos de uso (login, sincronização) pro painel de admin —
// nunca bloqueia nem falha a ação principal se o registro der errado.

import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { formatarDataISO } from './calcularCalendario'

export function registrarEvento(tipo, uid) {
  addDoc(collection(db, 'eventosApp'), {
    tipo,
    uid,
    dia: formatarDataISO(new Date()),
    criadoEm: new Date().toISOString(),
  }).catch(() => {})
}
