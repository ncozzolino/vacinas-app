import { useState } from 'react'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { auth, db, obterAccessTokenGoogle } from '../firebase'
import {
  gerarDosesDaCrianca,
  agruparPorDiaDeVisita,
  agruparPorSemana,
  formatarDataISO,
  paraDataLocal,
  formatarRotuloInjecoes,
} from '../utils/calcularCalendario'
import CalendarioSugerido from '../components/CalendarioSugerido.jsx'
import EscolhaEsquemaWizard from '../components/EscolhaEsquemaWizard.jsx'
import VaccineDetailSheet, { formatarRotuloDose } from '../components/VaccineDetailSheet.jsx'
import vacinasData from '../data/pni-calendario-vacinal.json'
import copyVacinas from '../data/copy-vacinas-app.json'
import { CORES_GOOGLE } from '../utils/coresGoogleCalendar.js'

export default function Calendario({ crianca, filhoId, emailResponsavel2, googleAccessToken, onGoogleToken }) {
  const [aba, setAba] = useState('meu') // 'sugerido' | 'meu'
  const [sincronizando, setSincronizando] = useState(false)
  const [sincMsg, setSincMsg] = useState(null) // { tipo: 'ok' | 'erro', texto }
  const [wizardAberto, setWizardAberto] = useState(false)
  const [doseParaConfirmar, setDoseParaConfirmar] = useState(null) // { vacinaId, dose, vacinaNome }
  const [dataConfirmacao, setDataConfirmacao] = useState('')
  const [detalhe, setDetalhe] = useState(null) // { vacina, dose }

  function abrirDetalhe(vacinaBase, dose) {
    setDetalhe({ vacina: vacinaBase, dose: dose || null })
  }

  const doses = gerarDosesDaCrianca(crianca.dataNascimento, crianca.datasAplicacao || {}, crianca.esquemaEscolhido || {})
  const dias = agruparPorDiaDeVisita(doses)

  // Vacinas com diferença real de esquema entre SUS e particular —
  // mostradas como decisão explícita, uma vez cada, no topo do "Meu calendário".
  // Só entra na lista se houver diferença REAL (datas ou efeitos colaterais) —
  // ex: BCG tem nota_preliminar mas não existe no particular, não é uma
  // decisão de verdade.
  const vacinasComDecisao = vacinasData.vacinas.filter(
    (v) => v.impacto_particular?.altera_datas_ou_doses || v.impacto_particular?.altera_efeitos_colaterais
  )

  function abrirConfirmacao(vacinaId, dose, vacinaNome) {
    setDataConfirmacao(formatarDataISO(new Date()))
    setDoseParaConfirmar({ vacinaId, dose, vacinaNome })
  }

  // Grava a data REAL em que a dose foi aplicada — é isso que permite ao
  // app recalcular as próximas doses da mesma vacina se houve atraso.
  async function confirmarAplicacao() {
    const { vacinaId, dose } = doseParaConfirmar
    const chave = `${vacinaId}_${dose}`
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid, 'filhos', filhoId), {
      [`datasAplicacao.${chave}`]: dataConfirmacao,
    })
    setDoseParaConfirmar(null)
  }

  async function desmarcar(vacinaId, dose) {
    const chave = `${vacinaId}_${dose}`
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid, 'filhos', filhoId), {
      [`datasAplicacao.${chave}`]: deleteField(),
    })
  }

  // Chamado pelo assistente de SUS×Particular ao confirmar: grava todas as
  // escolhas de uma vez (não por clique) e sempre sincroniza a Google Agenda
  // em seguida — sem esperar o onSnapshot propagar. Sincronização é
  // obrigatória aqui pra evitar mismatch entre o app e a Agenda; se falhar,
  // a decisão já salva não é desfeita, o erro só aparece no banner.
  async function salvarEscolhas(escolhas) {
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid, 'filhos', filhoId), {
      esquemaEscolhido: escolhas,
    })
    await sincronizarAgenda(escolhas)
  }

  // Sincroniza por SEMANA (não por dia exato) — dá uma margem real pros
  // pais: "essa semana" em vez de um dia específico que pode não bater com
  // a agenda do posto. Inclui semanas com dose pendente OU atrasada (só
  // fica de fora o que já foi aplicado).
  //
  // Idempotente: compara o calendário atual com `crianca.googleEventosSemana`
  // (o que foi sincronizado da última vez) e só manda pra API o que
  // realmente mudou — insere semana nova, atualiza semana cuja composição
  // de doses mudou (ex: trocou SUS→Particular), exclui semana que não tem
  // mais nada pendente. Rodar de novo sem mudar nada não duplica evento.
  //
  // `esquemaEscolhidoOverride`: usado pelo assistente de SUS×Particular pra
  // sincronizar com as escolhas recém-salvas sem esperar o onSnapshot do
  // Firestore propagar de volta pro prop `crianca`.
  async function sincronizarAgenda(esquemaEscolhidoOverride) {
    setSincronizando(true)
    setSincMsg(null)
    try {
      const token = googleAccessToken || (await obterAccessTokenGoogle())
      if (token !== googleAccessToken) onGoogleToken?.(token)
      if (!token) throw new Error('sem token')

      const dosesParaSync = esquemaEscolhidoOverride
        ? gerarDosesDaCrianca(crianca.dataNascimento, crianca.datasAplicacao || {}, esquemaEscolhidoOverride)
        : doses

      const mapaAtual = crianca.googleEventosSemana || {}
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const semanasRelevantes = agruparPorSemana(dosesParaSync)
        .filter((semana) => semana.doses.some((d) => d.status !== 'aplicada'))
        .map((semana) => ({
          chave: formatarDataISO(semana.inicioSemana),
          inicioSemanaData: semana.inicioSemana,
          inicioSemana: formatarDataISO(semana.inicioSemana),
          fimSemana: formatarDataISO(semana.fimSemana),
          doses: semana.doses,
          totalInjecoes: semana.totalInjecoes,
          composicao: semana.doses.map((d) => `${d.vacinaId}_${d.dose}`).sort().join('|'),
        }))

      const chaves = new Set([...Object.keys(mapaAtual), ...semanasRelevantes.map((s) => s.chave)])
      const operacoes = []

      for (const chave of chaves) {
        const atual = mapaAtual[chave]
        const alvo = semanasRelevantes.find((s) => s.chave === chave)

        if (!atual && alvo) {
          operacoes.push({ tipo: 'inserir', chave, inicioSemana: alvo.inicioSemana, fimSemana: alvo.fimSemana, doses: alvo.doses, totalInjecoes: alvo.totalInjecoes })
        } else if (atual && !alvo) {
          operacoes.push({ tipo: 'excluir', chave, eventId: atual.eventId })
        } else if (atual.composicao !== alvo.composicao) {
          if (alvo.inicioSemanaData < hoje) {
            // semana já passada: recria em vez de atualizar
            operacoes.push({ tipo: 'excluir', chave, eventId: atual.eventId })
            operacoes.push({ tipo: 'inserir', chave, inicioSemana: alvo.inicioSemana, fimSemana: alvo.fimSemana, doses: alvo.doses, totalInjecoes: alvo.totalInjecoes })
          } else {
            operacoes.push({ tipo: 'atualizar', chave, eventId: atual.eventId, inicioSemana: alvo.inicioSemana, fimSemana: alvo.fimSemana, doses: alvo.doses, totalInjecoes: alvo.totalInjecoes })
          }
        }
        // composição igual → nada a fazer, sem chamada à API
      }

      if (operacoes.length === 0) {
        setSincMsg({ tipo: 'ok', texto: 'Sua Agenda Google já está atualizada.' })
        return
      }

      const resp = await fetch('/.netlify/functions/criar-eventos-calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          operacoes,
          emailConvidado: emailResponsavel2 || undefined,
          nomeCrianca: crianca.nome,
          corGoogleId: CORES_GOOGLE[crianca.cor],
        }),
      })
      const resultado = await resp.json()
      if (!resp.ok) throw new Error(resultado.erro || 'Falha ao sincronizar.')

      const patch = {}
      for (const r of resultado.resultados) {
        if (!r.ok) continue
        if (r.tipo === 'excluir') {
          patch[`googleEventosSemana.${r.chave}`] = deleteField()
        } else {
          const origem = semanasRelevantes.find((s) => s.chave === r.chave)
          patch[`googleEventosSemana.${r.chave}`] = {
            eventId: r.eventId,
            composicao: origem?.composicao || '',
            totalInjecoes: origem?.totalInjecoes ?? 0,
            atualizadoEm: new Date().toISOString(),
          }
        }
      }
      if (Object.keys(patch).length > 0) {
        await updateDoc(doc(db, 'criancas', auth.currentUser.uid, 'filhos', filhoId), patch)
      }

      const inseridos = resultado.resultados.filter((r) => r.tipo === 'inserir' && r.ok).length
      const atualizados = resultado.resultados.filter((r) => r.tipo === 'atualizar' && r.ok).length
      const removidos = resultado.resultados.filter((r) => r.tipo === 'excluir' && r.ok).length
      const partes = []
      if (inseridos) partes.push(`${inseridos} novo(s)`)
      if (atualizados) partes.push(`${atualizados} atualizado(s)`)
      if (removidos) partes.push(`${removidos} removido(s)`)
      setSincMsg({ tipo: 'ok', texto: `Agenda Google sincronizada: ${partes.join(', ') || 'sem mudanças'}.` })
    } catch (erro) {
      setSincMsg({ tipo: 'erro', texto: erro.message && erro.message !== 'sem token' ? erro.message : 'Não foi possível sincronizar. Tente novamente.' })
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div style={{ padding: '34px 20px', maxWidth: 520, margin: '0 auto' }}>
      <h1 className="display" style={{ fontSize: 20 }}>Vacinação</h1>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
        Calculado a partir do nascimento de <b style={{ color: 'var(--ink)' }}>{crianca.nome}</b> — {paraDataLocal(crianca.dataNascimento).toLocaleDateString('pt-BR')}
      </p>

      <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 4, borderRadius: 100, marginTop: 14, boxShadow: 'var(--shadow-card)' }}>
        <button className="tap-scale" onClick={() => setAba('sugerido')} style={tabBtn(aba === 'sugerido')}>Calendário sugerido</button>
        <button className="tap-scale" onClick={() => setAba('meu')} style={tabBtn(aba === 'meu')}>Meu calendário</button>
      </div>

      {aba === 'sugerido' && (
        <CalendarioSugerido
          vacinas={vacinasData.vacinas}
          esquemaEscolhido={crianca.esquemaEscolhido}
          onSelecionar={(v) => abrirDetalhe(v, null)}
        />
      )}

      {aba === 'meu' && (
        <div style={{ marginTop: 20 }}>
          <button className="tap-scale" onClick={() => sincronizarAgenda()} disabled={sincronizando} style={btnSync}>
            {sincronizando ? 'Sincronizando…' : '📅  Sincronizar com Google Agenda'}
          </button>
          {sincMsg && (
            <p style={{
              fontSize: 12, marginTop: 8, marginBottom: 4, textAlign: 'center',
              color: sincMsg.tipo === 'ok' ? 'var(--green-deep)' : '#B2472C',
            }}>
              {sincMsg.texto}
            </p>
          )}

          {vacinasComDecisao.length > 0 && (
            <button
              className="tap-scale"
              onClick={() => setWizardAberto(true)}
              style={entradaDecisaoStyle}
            >
              <div style={{ textAlign: 'left' }}>
                <p style={decisionLabelStyle}>Decisões de esquema</p>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                  {vacinasComDecisao.length} vacinas com escolha SUS × Particular disponível
                </b>
              </div>
              <span style={{ fontSize: 14, color: 'var(--amber-deep)', flexShrink: 0, marginLeft: 10 }}>
                Revisar →
              </span>
            </button>
          )}

          {dias.map((dia) => (
            <div key={formatarDataISO(dia.data)} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{dia.data.toLocaleDateString('pt-BR')}</b>
                <span style={badgeStyle}>{formatarRotuloInjecoes(dia.totalInjecoes)}</span>
              </div>
              {dia.doses.map((d) => {
                const aplicada = d.status === 'aplicada'
                const vacinaBase = vacinasData.vacinas.find((v) => v.id === d.vacinaId)
                return (
                  <div
                    key={`${d.vacinaId}_${d.dose}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0' }}
                  >
                    <span
                      onClick={() => (aplicada ? desmarcar(d.vacinaId, d.dose) : abrirConfirmacao(d.vacinaId, d.dose, d.vacinaNome))}
                      className="tap-scale"
                      style={{ ...checkboxStyle(aplicada), cursor: 'pointer' }}
                      title={aplicada ? 'Toque para desmarcar' : 'Toque para confirmar a data de aplicação'}
                    >
                      {aplicada && '✓'}
                    </span>
                    <span
                      onClick={() => abrirDetalhe(vacinaBase, d)}
                      className="tap-scale"
                      style={{ flex: 1, cursor: 'pointer' }}
                      title="Toque para ver detalhes da vacina"
                    >
                      <span style={{
                        display: 'block', fontSize: 13.5,
                        color: aplicada ? 'var(--ink-soft)' : d.status === 'atrasada' ? 'var(--red-deep)' : 'var(--ink)',
                        textDecoration: aplicada ? 'line-through' : 'none',
                      }}>
                        {d.vacinaNome} — {formatarRotuloDose(d.dose)}
                      </span>
                      {aplicada && d.dataAplicacao && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--green-deep)', fontWeight: 600 }}>
                          aplicada em {paraDataLocal(d.dataAplicacao).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {!aplicada && d.status === 'atrasada' && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--red-deep)', fontWeight: 600 }}>
                          atrasada
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {doseParaConfirmar && (
        <div style={overlayStyle} onClick={() => setDoseParaConfirmar(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <p style={decisionLabelStyle}>Quando foi aplicada?</p>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
              {doseParaConfirmar.vacinaNome} — {formatarRotuloDose(doseParaConfirmar.dose)}
            </b>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
              Se a data for diferente da prevista, as próximas doses dessa vacina se ajustam automaticamente.
            </p>
            <input
              type="date"
              value={dataConfirmacao}
              max={formatarDataISO(new Date())}
              onChange={(e) => setDataConfirmacao(e.target.value)}
              style={inputDataStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="tap-scale" onClick={() => setDoseParaConfirmar(null)} style={btnModalSecundario}>
                Cancelar
              </button>
              <button className="tap-scale" onClick={confirmarAplicacao} disabled={!dataConfirmacao} style={btnModalPrimario}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {wizardAberto && (
        <EscolhaEsquemaWizard
          crianca={crianca}
          vacinas={vacinasComDecisao}
          onSalvar={salvarEscolhas}
          onFechar={() => setWizardAberto(false)}
        />
      )}

      {detalhe && (
        <VaccineDetailSheet
          vacina={detalhe.vacina}
          dose={detalhe.dose}
          copy={copyVacinas.vacinas[detalhe.vacina.id]}
          esquemaLabel={
            detalhe.dose
              ? (crianca.esquemaEscolhido?.[detalhe.vacina.id] === 'particular' ? 'Particular' : 'SUS')
              : null
          }
          onFechar={() => setDetalhe(null)}
        />
      )}
    </div>
  )
}

const cardStyle = { background: 'var(--card)', borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: 'var(--shadow-card)' }
const badgeStyle = { fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 100, background: 'var(--amber-tint)', color: 'var(--amber-deep)' }
const btnSync = {
  width: '100%', border: 'none', borderRadius: 14, padding: 13, marginTop: 16,
  background: 'var(--blue)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
}
function tabBtn(ativo) {
  return {
    flex: 1, border: 'none', padding: 9, borderRadius: 100, fontWeight: 700, fontSize: 12,
    background: ativo ? 'var(--blue)' : 'transparent', cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  }
}
const entradaDecisaoStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  width: '100%', textAlign: 'left', cursor: 'pointer',
  background: 'var(--amber-tint)', border: '1px solid #E8C596',
  borderRadius: 16, padding: 15, marginBottom: 12, boxShadow: 'var(--shadow-card)',
}
const decisionLabelStyle = {
  fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '.05em', color: 'var(--amber-deep)', margin: 0,
}
function checkboxStyle(aplicada) {
  return {
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1,
    background: aplicada ? 'var(--green-deep)' : 'transparent',
    border: aplicada ? 'none' : '2px solid var(--line)',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  }
}
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(51,65,77,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, zIndex: 100,
}
const modalStyle = {
  background: 'var(--card)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 340,
  boxShadow: 'var(--shadow-card)',
}
const inputDataStyle = {
  width: '100%', padding: 11, marginTop: 14, borderRadius: 12,
  border: '1px solid var(--line)', fontSize: 14,
}
const btnModalSecundario = {
  flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--line)',
  background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
}
const btnModalPrimario = {
  flex: 1, padding: 12, borderRadius: 12, border: 'none',
  background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
