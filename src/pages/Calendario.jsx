import { useState } from 'react'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { auth, db, obterAccessTokenGoogle } from '../firebase'
import {
  gerarDosesDaCrianca,
  agruparPorDiaDeVisita,
  agruparPorSemana,
  formatarDataISO,
  paraDataLocal,
} from '../utils/calcularCalendario'
import DecisionCard from '../components/DecisionCard.jsx'
import vacinasData from '../data/pni-calendario-vacinal.json'

export default function Calendario({ crianca, googleAccessToken, onGoogleToken }) {
  const [aba, setAba] = useState('meu') // 'sugerido' | 'meu'
  const [sincronizando, setSincronizando] = useState(false)
  const [sincMsg, setSincMsg] = useState(null) // { tipo: 'ok' | 'erro', texto }
  const [decisoesAbertas, setDecisoesAbertas] = useState(false)
  const [doseParaConfirmar, setDoseParaConfirmar] = useState(null) // { vacinaId, dose, vacinaNome }
  const [dataConfirmacao, setDataConfirmacao] = useState('')

  const doses = gerarDosesDaCrianca(crianca.dataNascimento, crianca.datasAplicacao || {})
  const dias = agruparPorDiaDeVisita(doses)

  // Vacinas com diferença real de esquema entre SUS e particular —
  // mostradas como decisão explícita, uma vez cada, no topo do "Meu calendário".
  const vacinasComDecisao = vacinasData.vacinas.filter((v) => v.esquema_particular?.nota_preliminar)

  function abrirConfirmacao(vacinaId, dose, vacinaNome) {
    setDataConfirmacao(formatarDataISO(new Date()))
    setDoseParaConfirmar({ vacinaId, dose, vacinaNome })
  }

  // Grava a data REAL em que a dose foi aplicada — é isso que permite ao
  // app recalcular as próximas doses da mesma vacina se houve atraso.
  async function confirmarAplicacao() {
    const { vacinaId, dose } = doseParaConfirmar
    const chave = `${vacinaId}_${dose}`
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      [`datasAplicacao.${chave}`]: dataConfirmacao,
    })
    setDoseParaConfirmar(null)
  }

  async function desmarcar(vacinaId, dose) {
    const chave = `${vacinaId}_${dose}`
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      [`datasAplicacao.${chave}`]: deleteField(),
    })
  }

  async function escolherEsquema(vacinaId, escolha) {
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      [`esquemaEscolhido.${vacinaId}`]: escolha,
    })
  }

  // Sincroniza por SEMANA (não por dia exato) — dá uma margem real pros
  // pais: "essa semana" em vez de um dia específico que pode não bater com
  // a agenda do posto. Só semanas com doses ainda pendentes.
  async function sincronizarAgenda() {
    setSincronizando(true)
    setSincMsg(null)
    try {
      const token = googleAccessToken || (await obterAccessTokenGoogle())
      if (token !== googleAccessToken) onGoogleToken?.(token)
      if (!token) throw new Error('sem token')

      const semanasPendentes = agruparPorSemana(doses)
        .filter((semana) => semana.doses.some((d) => d.status === 'pendente'))
        .map((semana) => ({
          inicioSemana: formatarDataISO(semana.inicioSemana),
          fimSemana: formatarDataISO(semana.fimSemana),
          doses: semana.doses,
          totalPicadas: semana.totalPicadas,
        }))

      const resp = await fetch('/.netlify/functions/criar-eventos-calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          semanas: semanasPendentes,
          emailConvidado: crianca.emailResponsavel2 || undefined,
          nomeCrianca: crianca.nome,
        }),
      })
      const resultado = await resp.json()
      if (!resp.ok) throw new Error(resultado.erro || 'falha')

      setSincMsg({ tipo: 'ok', texto: `${resultado.criados} evento(s) criado(s) na sua Agenda Google.` })
    } catch {
      setSincMsg({ tipo: 'erro', texto: 'Não foi possível sincronizar. Tente novamente.' })
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
        <div style={{ marginTop: 20 }}>
          {vacinasData.vacinas.map((v) => (
            <div key={v.id} style={cardStyle}>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 14.5 }}>{v.nome_sus}</b>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '4px 0 0' }}>{v.doencas_evitadas.join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {aba === 'meu' && (
        <div style={{ marginTop: 20 }}>
          <button className="tap-scale" onClick={sincronizarAgenda} disabled={sincronizando} style={btnSync}>
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
            <div style={decisionSectionStyle}>
              <button
                className="tap-scale"
                onClick={() => setDecisoesAbertas((a) => !a)}
                style={decisionHeaderStyle}
              >
                <div style={{ textAlign: 'left' }}>
                  <p style={decisionLabelStyle}>Decisões de esquema</p>
                  <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                    {vacinasComDecisao.length} vacinas com diferença SUS × Particular
                  </b>
                </div>
                <span style={chevronStyle(decisoesAbertas)}>▾</span>
              </button>

              {decisoesAbertas && (
                <div style={{ marginTop: 10 }}>
                  {vacinasComDecisao.map((v) => (
                    <DecisionCard
                      key={v.id}
                      vacina={v}
                      escolhaAtual={crianca.esquemaEscolhido?.[v.id]}
                      onEscolher={escolherEsquema}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {dias.map((dia) => (
            <div key={formatarDataISO(dia.data)} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{dia.data.toLocaleDateString('pt-BR')}</b>
                <span style={badgeStyle}>{dia.totalPicadas} picada{dia.totalPicadas > 1 ? 's' : ''}</span>
              </div>
              {dia.doses.map((d) => {
                const aplicada = d.status === 'aplicada'
                return (
                  <div
                    key={`${d.vacinaId}_${d.dose}`}
                    onClick={() => (aplicada ? desmarcar(d.vacinaId, d.dose) : abrirConfirmacao(d.vacinaId, d.dose, d.vacinaNome))}
                    className="tap-scale"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', cursor: 'pointer' }}
                    title={aplicada ? 'Toque para desmarcar' : 'Toque para confirmar a data de aplicação'}
                  >
                    <span style={checkboxStyle(aplicada)}>{aplicada && '✓'}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{
                        display: 'block', fontSize: 13.5,
                        color: aplicada ? 'var(--ink-soft)' : d.status === 'atrasada' ? 'var(--red-deep)' : 'var(--ink)',
                        textDecoration: aplicada ? 'line-through' : 'none',
                      }}>
                        {d.vacinaNome} — {d.dose}ª dose
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
              {doseParaConfirmar.vacinaNome} — {doseParaConfirmar.dose}ª dose
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
const decisionSectionStyle = {
  background: 'var(--amber-tint)', border: '1px solid #E8C596',
  borderRadius: 16, padding: 15, marginBottom: 12, boxShadow: 'var(--shadow-card)',
}
const decisionHeaderStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  width: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
}
const decisionLabelStyle = {
  fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '.05em', color: 'var(--amber-deep)', margin: 0,
}
function chevronStyle(aberto) {
  return {
    fontSize: 14, color: 'var(--amber-deep)', flexShrink: 0, marginLeft: 10,
    transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease',
  }
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
