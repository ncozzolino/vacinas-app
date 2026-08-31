// Netlify Function — roda no servidor, nunca no navegador.
// Recebe o token OAuth do usuário (obtido no login com Google no client)
// e a lista de dias de visita já calculada, e cria um evento por DIA
// (não por vacina) — cada evento já lista quais vacinas/picadas acontecem
// naquele dia, e pode convidar o segundo responsável.
//
// Endpoint: /.netlify/functions/criar-eventos-calendario

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' }
  }

  try {
    const { accessToken, dias, emailConvidado } = JSON.parse(event.body)

    if (!accessToken || !Array.isArray(dias)) {
      return { statusCode: 400, body: 'Parâmetros inválidos: accessToken e dias são obrigatórios.' }
    }

    const resultados = []

    for (const dia of dias) {
      const descricao = dia.doses
        .map((d) => `• ${d.vacinaNome} — ${d.dose}ª dose`)
        .join('\n')

      const evento = {
        summary: `Vacina${dia.doses.length > 1 ? 's' : ''}: ${dia.doses.length} picada${dia.doses.length > 1 ? 's' : ''}`,
        description: descricao,
        start: { date: dia.data }, // evento de dia inteiro, formato AAAA-MM-DD
        end: { date: dia.data },
        attendees: emailConvidado ? [{ email: emailConvidado }] : [],
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 24 * 60 }], // lembrete 1 dia antes
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
      resultados.push({ data: dia.data, ok: resp.ok, eventId: data.id || null })
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ criados: resultados.filter((r) => r.ok).length, resultados }),
    }
  } catch (erro) {
    return { statusCode: 500, body: JSON.stringify({ erro: erro.message }) }
  }
}
