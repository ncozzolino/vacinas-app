// Netlify Function — roda no servidor, nunca no navegador.
// Recebe o token OAuth do usuário (obtido no login com Google no client)
// e a lista de SEMANAS de visita já calculada, e cria um evento de dia
// inteiro por SEMANA (segunda a domingo) — não por dia exato. Isso dá uma
// margem real pros pais: a data calculada é uma referência, não um
// compromisso marcado; qualquer dia daquela semana serve. Cada evento já
// lista quais vacinas/picadas estão previstas, e pode convidar o segundo
// responsável.
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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' }
  }

  try {
    const { accessToken, semanas, emailConvidado, nomeCrianca } = JSON.parse(event.body)

    if (!accessToken || !Array.isArray(semanas)) {
      return { statusCode: 400, body: 'Parâmetros inválidos: accessToken e semanas são obrigatórios.' }
    }

    const nome = nomeCrianca || 'seu bebê'
    const resultados = []

    for (const semana of semanas) {
      const totalPicadas = semana.totalPicadas ?? semana.doses.length
      const descricaoVacinas = semana.doses
        .map((d) => `• ${d.vacinaNome} — ${d.dose}ª dose`)
        .join('\n')

      const evento = {
        summary: `💉 Semana de vacina — ${nome}`,
        description:
          `${totalPicadas} picada${totalPicadas > 1 ? 's' : ''} previstas nesta semana ` +
          `(${formatarBR(semana.inicioSemana)} a ${formatarBR(semana.fimSemana)}) — qualquer dia útil serve, ` +
          `não precisa ser numa data exata:\n\n${descricaoVacinas}\n\n` +
          `Leve a caderneta de vacinação. Depois da picada, um carinho extra sempre ajuda 💙`,
        // Evento de dia inteiro cobrindo a semana toda — end.date é exclusivo
        // na API do Google Calendar, por isso soma 1 dia ao fim da semana.
        start: { date: semana.inicioSemana },
        end: { date: proximoDiaISO(semana.fimSemana) },
        attendees: emailConvidado ? [{ email: emailConvidado }] : [],
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 24 * 60 }], // lembrete 1 dia antes do início da semana
        },
      }

      const resp = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(evento),
        }
      )

      const data = await resp.json()
      resultados.push({ inicioSemana: semana.inicioSemana, ok: resp.ok, eventId: data.id || null })
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ criados: resultados.filter((r) => r.ok).length, resultados }),
    }
  } catch (erro) {
    return { statusCode: 500, body: JSON.stringify({ erro: erro.message }) }
  }
}
