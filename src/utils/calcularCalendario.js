// Núcleo do produto: dado o nascimento da criança + a base de vacinas do PNI,
// gera cada dose com sua data prevista, e agrupa por DIA DE VISITA
// (várias vacinas podem cair no mesmo dia — isso é o que o "Meu calendário"
// mostra: quantas picadas acontecem em cada visita).

import vacinasData from '../data/pni-calendario-vacinal.json'

/**
 * Soma um número de meses a uma data de nascimento.
 */
function somarMeses(dataNascimento, meses) {
  const d = new Date(dataNascimento)
  d.setMonth(d.getMonth() + meses)
  return d
}

/**
 * Gera a lista completa de doses (achatada) para uma criança,
 * a partir da data de nascimento.
 */
export function gerarDosesDaCrianca(dataNascimentoISO) {
  const doses = []

  for (const vacina of vacinasData.vacinas) {
    for (const item of vacina.esquema_sus) {
      doses.push({
        vacinaId: vacina.id,
        vacinaNome: vacina.nome_sus,
        doencasEvitadas: vacina.doencas_evitadas,
        dose: item.dose,
        idadeLabel: item.idade_label,
        dataPrevista: somarMeses(dataNascimentoISO, item.idade_alvo_meses),
        obs: item.obs || null,
        viaAdministracao: vacina.via_administracao || 'Injetável (picada)',
        status: 'pendente', // 'pendente' | 'aplicada' | 'atrasada'
      })
    }
  }

  // Ordena cronologicamente
  doses.sort((a, b) => a.dataPrevista - b.dataPrevista)
  return doses
}

/**
 * Agrupa a lista de doses por DIA DE VISITA (mesma data = mesma ida ao posto/clínica).
 * Retorna um array de "dias", cada um com a data, a idade da criança naquele dia,
 * o total de picadas (excluindo orais, como o rotavírus) e as doses envolvidas.
 */
export function agruparPorDiaDeVisita(doses) {
  const porData = new Map()

  for (const dose of doses) {
    const chave = dose.dataPrevista.toISOString().slice(0, 10)
    if (!porData.has(chave)) {
      porData.set(chave, { data: dose.dataPrevista, doses: [] })
    }
    porData.get(chave).doses.push(dose)
  }

  return Array.from(porData.values())
    .sort((a, b) => a.data - b.data)
    .map((dia) => ({
      ...dia,
      totalPicadas: dia.doses.filter(
        (d) => !d.viaAdministracao?.toLowerCase().includes('oral')
      ).length,
    }))
}

/**
 * Marca uma dose específica como aplicada (usado quando o pai confirma no app).
 */
export function marcarComoAplicada(doses, vacinaId, dose) {
  return doses.map((d) =>
    d.vacinaId === vacinaId && d.dose === dose ? { ...d, status: 'aplicada' } : d
  )
}

/**
 * Retorna o próximo dia de visita com doses pendentes (para o card
 * "Próximo dia de vacina" na Home).
 */
export function proximoDiaDeVisita(diasAgrupados) {
  const hoje = new Date()
  return diasAgrupados.find(
    (dia) => dia.data >= hoje && dia.doses.some((d) => d.status === 'pendente')
  )
}
