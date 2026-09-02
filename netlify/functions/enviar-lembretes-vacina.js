// Função agendada (ver netlify.toml) — roda 1x por dia e manda um lembrete
// push 7 dias e 1 dia antes da segunda-feira de cada semana de vacinação
// ainda pendente. Usa o Admin SDK (ignora as regras do Firestore) porque
// precisa ler os filhos de TODAS as contas, não só a de quem está logado.
//
// Reaproveita a mesma lógica de geração de doses/semanas do cliente
// (`calcularCalendario.js`) — é código Node-safe (só usa Date/Array/Map).

import admin from 'firebase-admin'
import webpush from 'web-push'
import {
  gerarDosesDaCrianca,
  agruparPorSemana,
  formatarDataISO,
  paraDataLocal,
  somarDias,
  formatarRotuloInjecoes,
} from '../../src/utils/calcularCalendario.js'

function formatarBR(date) {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
  })
}
const dbAdmin = admin.firestore()

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function handler() {
  // "Hoje" precisa ser calculado no fuso de Brasília explicitamente — a
  // function roda em UTC, e um `new Date()` puro pode cair no dia errado
  // durante a noite no Brasil (UTC-3).
  const hojeISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const hoje = paraDataLocal(hojeISO)
  const alvo7 = formatarDataISO(somarDias(hoje, 7))
  const alvo1 = formatarDataISO(somarDias(hoje, 1))

  const filhosSnap = await dbAdmin.collectionGroup('filhos').get()
  let enviados = 0

  for (const filhoDoc of filhosSnap.docs) {
    const filho = filhoDoc.data()
    if (!filho.dataNascimento) continue

    const doses = gerarDosesDaCrianca(filho.dataNascimento, filho.datasAplicacao || {}, filho.esquemaEscolhido || {})
    const semanas = agruparPorSemana(doses).filter((s) => s.doses.some((d) => d.status !== 'aplicada'))

    for (const [alvo, sufixo] of [[alvo7, '7d'], [alvo1, '1d']]) {
      const semana = semanas.find((s) => formatarDataISO(s.inicioSemana) === alvo)
      if (!semana) continue

      const flagKey = `${formatarDataISO(semana.inicioSemana)}_${sufixo}`
      if (filho.lembretesEnviados?.[flagKey]) continue // já avisado, não repete

      const contaRef = filhoDoc.ref.parent.parent // criancas/{uid}
      const subsSnap = await contaRef.collection('pushSubscriptions').get()
      if (subsSnap.empty) continue

      const titulo = sufixo === '7d'
        ? `Vacina de ${filho.nome} em 1 semana`
        : `Vacina de ${filho.nome} amanhã`
      const corpo = `${formatarRotuloInjecoes(semana.totalInjecoes)} previstas — semana de ` +
        `${formatarBR(semana.inicioSemana)} a ${formatarBR(semana.fimSemana)}.`
      const payload = JSON.stringify({ title: titulo, body: corpo, url: '/' })

      for (const subDoc of subsSnap.docs) {
        try {
          await webpush.sendNotification(subDoc.data(), payload)
          enviados++
        } catch (erro) {
          // 404/410 = assinatura expirada ou revogada pelo navegador — apaga
          if (erro.statusCode === 404 || erro.statusCode === 410) {
            await subDoc.ref.delete()
          }
        }
      }

      await filhoDoc.ref.update({ [`lembretesEnviados.${flagKey}`]: true })
    }
  }

  return { statusCode: 200, body: JSON.stringify({ enviados }) }
}
