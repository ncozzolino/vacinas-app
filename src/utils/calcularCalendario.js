// Núcleo do produto: dado o nascimento da criança + a base de vacinas do PNI,
// gera cada dose com sua data prevista, e agrupa por DIA DE VISITA
// (várias vacinas podem cair no mesmo dia — isso é o que o "Meu calendário"
// mostra: quantas injeções acontecem em cada visita).

import vacinasData from '../data/pni-calendario-vacinal.json'

// new Date('AAAA-MM-DD') interpreta a string como meia-noite em UTC, não no
// fuso local — no Brasil (UTC-3) isso faz a data "vazar" pro dia anterior
// depois de qualquer conversão para local (toLocaleDateString, getDate etc).
// Por isso construímos a data manualmente em horário local.
export function paraDataLocal(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

/**
 * Formata uma data (local) como 'AAAA-MM-DD' — sempre usar isto em vez de
 * toISOString().slice(0,10), que converte pra UTC e pode voltar um dia.
 */
export function formatarDataISO(date) {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/**
 * "1 injeção" / "N injeções" — plural correto, não é só um "+s".
 */
export function formatarRotuloInjecoes(n) {
  return `${n} injeç${n === 1 ? 'ão' : 'ões'}`
}

function somarMeses(dataNascimento, meses) {
  const d = paraDataLocal(dataNascimento)
  d.setMonth(d.getMonth() + meses)
  return d
}

export function somarDias(date, dias) {
  const d = new Date(date)
  d.setDate(d.getDate() + dias)
  return d
}

function diasEntre(de, para) {
  const MS_POR_DIA = 24 * 60 * 60 * 1000
  return Math.round((paraMeiaNoite(para) - paraMeiaNoite(de)) / MS_POR_DIA)
}

function paraMeiaNoite(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Gera a lista completa de doses (achatada) para uma criança, a partir da
 * data de nascimento e (opcionalmente) das datas reais de aplicação já
 * confirmadas pelo responsável — `datasAplicacao`, um mapa
 * `{ "<vacinaId>_<dose>": "AAAA-MM-DD" }`.
 *
 * Quando uma dose é confirmada com atraso (ou adiantada) em relação à data
 * prevista original, as PRÓXIMAS doses da MESMA vacina são deslocadas pelo
 * mesmo número de dias — mantém o espaçamento relativo do esquema mesmo
 * quando a rotina atrasa uma aplicação. Isso é um ajuste genérico de
 * calendário, não uma regra clínica de intervalo mínimo entre doses (essa
 * informação não está na nossa base — ver observação no README); doses de
 * vacinas DIFERENTES nunca se afetam entre si.
 *
 * `esquemaEscolhido` — mapa `{ <vacinaId>: 'sus' | 'particular' }` — decide
 * qual grade de datas usar por vacina. Só tem efeito nas vacinas que têm
 * `impacto_particular.doses_particular` na base (esquema realmente diferente,
 * com fonte); escolher "Particular" numa vacina sem isso continua usando as
 * datas do SUS, porque é a única grade que temos confirmada.
 */
export function gerarDosesDaCrianca(dataNascimentoISO, datasAplicacao = {}, esquemaEscolhido = {}) {
  const doses = []
  const hoje = paraMeiaNoite(new Date())

  for (const vacina of vacinasData.vacinas) {
    const usaParticular = esquemaEscolhido[vacina.id] === 'particular' && vacina.impacto_particular?.doses_particular
    const esquema = usaParticular ? vacina.impacto_particular.doses_particular : vacina.esquema_sus
    let deslocamentoDias = 0 // atraso/adiantamento da última dose confirmada desta vacina

    for (const item of esquema) {
      const chave = `${vacina.id}_${item.dose}`
      const dataOriginal = somarMeses(dataNascimentoISO, item.idade_alvo_meses)
      const dataConfirmadaISO = datasAplicacao[chave] || null
      const dataConfirmada = dataConfirmadaISO ? paraDataLocal(dataConfirmadaISO) : null

      let dataPrevista
      if (dataConfirmada) {
        dataPrevista = dataConfirmada
        deslocamentoDias = diasEntre(dataOriginal, dataConfirmada)
      } else {
        dataPrevista = somarDias(dataOriginal, deslocamentoDias)
      }

      doses.push({
        vacinaId: vacina.id,
        vacinaNome: vacina.nome_sus,
        doencasEvitadas: vacina.doencas_evitadas,
        dose: item.dose,
        idadeLabel: item.idade_label,
        dataPrevista,
        dataOriginal,
        dataAplicacao: dataConfirmadaISO,
        obs: item.obs || null,
        viaAdministracao: vacina.via_administracao || 'Injetável (injeção)',
        status: dataConfirmada ? 'aplicada' : (dataPrevista < hoje ? 'atrasada' : 'pendente'),
        esquemaUsado: usaParticular ? 'particular' : 'sus',
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
 * o total de injeções (excluindo orais, como o rotavírus) e as doses envolvidas.
 */
export function agruparPorDiaDeVisita(doses) {
  const porData = new Map()

  for (const dose of doses) {
    const chave = formatarDataISO(dose.dataPrevista)
    if (!porData.has(chave)) {
      porData.set(chave, { data: dose.dataPrevista, doses: [] })
    }
    porData.get(chave).doses.push(dose)
  }

  return Array.from(porData.values())
    .sort((a, b) => a.data - b.data)
    .map((dia) => ({
      ...dia,
      totalInjecoes: dia.doses.filter(
        (d) => !d.viaAdministracao?.toLowerCase().includes('oral')
      ).length,
    }))
}

function inicioDaSemana(date) {
  const d = paraMeiaNoite(date)
  const diaSemana = d.getDay() // 0 = domingo, 1 = segunda, ...
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana
  return somarDias(d, deslocamento)
}

/**
 * Agrupa doses por SEMANA (segunda a domingo) em vez de dia exato — usado
 * na sincronização com o Google Agenda, pra dar uma margem real aos pais:
 * "nesta semana" em vez de apontar um dia específico que pode não bater
 * exatamente com a agenda do posto/clínica.
 */
export function agruparPorSemana(doses) {
  const porSemana = new Map()

  for (const dose of doses) {
    const inicio = inicioDaSemana(dose.dataPrevista)
    const chave = formatarDataISO(inicio)
    if (!porSemana.has(chave)) {
      porSemana.set(chave, { inicioSemana: inicio, fimSemana: somarDias(inicio, 6), doses: [] })
    }
    porSemana.get(chave).doses.push(dose)
  }

  return Array.from(porSemana.values())
    .sort((a, b) => a.inicioSemana - b.inicioSemana)
    .map((semana) => ({
      ...semana,
      totalInjecoes: semana.doses.filter(
        (d) => !d.viaAdministracao?.toLowerCase().includes('oral')
      ).length,
    }))
}

/**
 * Retorna o próximo dia de visita com doses pendentes (para o card
 * "Próximo dia de vacina" na Home).
 */
export function proximoDiaDeVisita(diasAgrupados) {
  const hoje = paraMeiaNoite(new Date())
  return diasAgrupados.find(
    (dia) => dia.data >= hoje && dia.doses.some((d) => d.status !== 'aplicada')
  )
}

/**
 * Lista achatada de doses atrasadas (previstas no passado e ainda não
 * confirmadas) — usada no banner de alerta da Home.
 */
export function dosesAtrasadas(doses) {
  return doses.filter((d) => d.status === 'atrasada')
}
