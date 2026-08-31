import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db, obterAccessTokenGoogle } from '../firebase'
import { gerarDosesDaCrianca, agruparPorDiaDeVisita } from '../utils/calcularCalendario'
import DecisionCard from '../components/DecisionCard.jsx'
import vacinasData from '../data/pni-calendario-vacinal.json'

export default function Calendario({ crianca, googleAccessToken, onGoogleToken }) {
  const [aba, setAba] = useState('meu') // 'sugerido' | 'meu'
  const [sincronizando, setSincronizando] = useState(false)
  const [sincMsg, setSincMsg] = useState(null) // { tipo: 'ok' | 'erro', texto }

  const doses = gerarDosesDaCrianca(crianca.dataNascimento).map((d) => {
    const chave = `${d.vacinaId}_${d.dose}`
    return crianca.dosesConcluidas?.[chave] ? { ...d, status: 'aplicada' } : d
  })
  const dias = agruparPorDiaDeVisita(doses)

  // Vacinas com diferença real de esquema entre SUS e particular —
  // mostradas como decisão explícita, uma vez cada, no topo do "Meu calendário".
  const vacinasComDecisao = vacinasData.vacinas.filter((v) => v.esquema_particular?.nota_preliminar)

  async function marcarAplicada(vacinaId, dose) {
    const chave = `${vacinaId}_${dose}`
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      [`dosesConcluidas.${chave}`]: true,
    })
  }

  async function escolherEsquema(vacinaId, escolha) {
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      [`esquemaEscolhido.${vacinaId}`]: escolha,
    })
  }

  // Só sincroniza dias com doses ainda pendentes — não faz sentido criar
  // evento de agenda para uma visita que já aconteceu.
  async function sincronizarAgenda() {
    setSincronizando(true)
    setSincMsg(null)
    try {
      const token = googleAccessToken || (await obterAccessTokenGoogle())
      if (token !== googleAccessToken) onGoogleToken?.(token)
      if (!token) throw new Error('sem token')

      const diasPendentes = dias
        .filter((dia) => dia.doses.some((d) => d.status === 'pendente'))
        .map((dia) => ({ data: dia.data.toISOString().slice(0, 10), doses: dia.doses }))

      const resp = await fetch('/.netlify/functions/criar-eventos-calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          dias: diasPendentes,
          emailConvidado: crianca.emailResponsavel2 || undefined,
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
    <div style={{ padding: '34px 20px' }}>
      <h1 className="display" style={{ fontSize: 20 }}>Vacinação</h1>

      <div style={{ display: 'flex', gap: 6, background: '#fff', padding: 4, borderRadius: 100, marginTop: 14 }}>
        <button onClick={() => setAba('sugerido')} style={tabBtn(aba === 'sugerido')}>Calendário sugerido</button>
        <button onClick={() => setAba('meu')} style={tabBtn(aba === 'meu')}>Meu calendário</button>
      </div>

      {aba === 'sugerido' && (
        <div style={{ marginTop: 20 }}>
          {vacinasData.vacinas.map((v) => (
            <div key={v.id} style={cardStyle}>
              <b>{v.nome_sus}</b>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{v.doencas_evitadas.join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {aba === 'meu' && (
        <div style={{ marginTop: 20 }}>
          <button onClick={sincronizarAgenda} disabled={sincronizando} style={btnSync}>
            {sincronizando ? 'Sincronizando…' : '📅 Sincronizar com Google Agenda'}
          </button>
          {sincMsg && (
            <p style={{
              fontSize: 12, marginTop: 8, marginBottom: 4,
              color: sincMsg.tipo === 'ok' ? 'var(--green-deep)' : '#B2472C',
            }}>
              {sincMsg.texto}
            </p>
          )}

          {vacinasComDecisao.map((v) => (
            <DecisionCard
              key={v.id}
              vacina={v}
              escolhaAtual={crianca.esquemaEscolhido?.[v.id]}
              onEscolher={escolherEsquema}
            />
          ))}

          {dias.map((dia) => (
            <div key={dia.data.toISOString()} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{dia.data.toLocaleDateString('pt-BR')}</b>
                <span style={badgeStyle}>{dia.totalPicadas} picada{dia.totalPicadas > 1 ? 's' : ''}</span>
              </div>
              {dia.doses.map((d) => (
                <div
                  key={`${d.vacinaId}_${d.dose}`}
                  onClick={() => d.status !== 'aplicada' && marcarAplicada(d.vacinaId, d.dose)}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer' }}
                >
                  <span>{d.vacinaNome} — {d.dose}ª dose</span>
                  <span style={{ color: d.status === 'aplicada' ? 'var(--green-deep)' : 'var(--ink-soft)' }}>
                    {d.status === 'aplicada' ? '✓ aplicada' : 'toque para marcar'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const cardStyle = { background: 'var(--card)', borderRadius: 18, padding: 16, marginBottom: 12 }
const badgeStyle = { fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 100, background: 'var(--amber-tint)', color: 'var(--amber-deep)' }
const btnSync = {
  width: '100%', border: 'none', borderRadius: 14, padding: 13, marginTop: 16,
  background: 'var(--blue)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
function tabBtn(ativo) {
  return {
    flex: 1, border: 'none', padding: 9, borderRadius: 100, fontWeight: 700, fontSize: 12,
    background: ativo ? 'var(--blue)' : 'transparent', cursor: 'pointer',
  }
}
