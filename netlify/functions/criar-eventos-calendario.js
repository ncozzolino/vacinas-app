// Netlify Function — roda no servidor, nunca no navegador.
// Recebe o token OAuth do usuário e uma lista de OPERAÇÕES já decididas
// pelo cliente (inserir / atualizar / excluir), uma por semana de visita —
// o cliente já comparou o calendário atual com o que foi sincronizado da
// última vez (guardado em `googleEventosSemana` no Firestore) e decidiu o
// que precisa mudar. Essa function só executa: nunca insere sem que o
// cliente peça, então rodar a sincronização de novo sem mudanças não cria
// eventos duplicados.
//
// Cada evento é de dia inteiro cobrindo a semana toda (segunda a domingo)
// — dá uma margem real pros pais: a data é uma referência, não um
// compromisso marcado; qualquer dia daquela semana serve.
//
// Endpoint: /.netlify/functions/criar-eventos-calendario

function proximoDiaISO(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatarBR(iso) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function formatarRotuloInjecoes(n) {
  return `${n} injeç${n === 1 ? 'ão' : 'ões'}`
}

function montarEvento(op, nome, emailConvidado, corGoogleId) {
  const totalInjecoes = op.totalInjecoes ?? op.doses.length
  const descricaoVacinas = op.doses.map((d) => `• ${d.vacinaNome} — ${d.dose}ª dose`).join('\n')

  return {
    summary: `💉 Semana de vacina — ${nome}`,
    description:
      `${formatarRotuloInjecoes(totalInjecoes)} previstas nesta semana ` +
      `(${formatarBR(op.inicioSemana)} a ${formatarBR(op.fimSemana)}) — qualquer dia útil serve, ` +
      `não precisa ser numa data exata:\n\n${descricaoVacinas}\n\n` +
      `Leve a caderneta de vacinação. Depois da injeção, um carinho extra sempre ajuda 💙`,
    // Evento de dia inteiro cobrindo a semana toda — end.date é exclusivo
    // na API do Google Calendar, por isso soma 1 dia ao fim da semana.
    start: { date: op.inicioSemana },
    end: { date: proximoDiaISO(op.fimSemana) },
    attendees: emailConvidado ? [{ email: emailConvidado }] : [],
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 24 * 60 }], // lembrete 1 dia antes do início da semana
    },
    colorId: corGoogleId || undefined,
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' }
  }

  try {
    const { accessToken, operacoes, emailConvidado, nomeCrianca, corGoogleId } = JSON.parse(event.body)

    if (!accessToken || !Array.isArray(operacoes)) {
      return { statusCode: 400, body: 'Parâmetros inválidos: accessToken e operacoes são obrigatórios.' }
    }

    const nome = nomeCrianca || 'seu bebê'
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const resultados = []

    for (const op of operacoes) {
      try {
        if (op.tipo === 'excluir') {
          const resp = await fetch(`${base}/${op.eventId}`, { method: 'DELETE', headers })
          // 404 = evento já não existe (ex: apagado manualmente) — considera concluído
          resultados.push({ tipo: 'excluir', chave: op.chave, ok: resp.ok || resp.status === 404 })
          continue
        }

        const evento = montarEvento(op, nome, emailConvidado, corGoogleId)

        if (op.tipo === 'atualizar') {
          let resp = await fetch(`${base}/${op.eventId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(evento),
          })
          if (resp.status === 404) {
            // evento sumiu da agenda do usuário (ex: apagado manualmente) — insere um novo
            resp = await fetch(base, { method: 'POST', headers, body: JSON.stringify(evento) })
          }
          const data = await resp.json()
          resultados.push({ tipo: 'atualizar', chave: op.chave, ok: resp.ok, eventId: data.id || op.eventId })
          continue
        }

        // inserir
        const resp = await fetch(base, { method: 'POST', headers, body: JSON.stringify(evento) })
        const data = await resp.json()
        resultados.push({ tipo: 'inserir', chave: op.chave, ok: resp.ok, eventId: data.id || null })
      } catch {
        resultados.push({ tipo: op.tipo, chave: op.chave, ok: false })
      }
    }

    return { statusCode: 200, body: JSON.stringify({ resultados }) }
  } catch (erro) {
    return { statusCode: 500, body: JSON.stringify({ erro: erro.message }) }
  }
}
