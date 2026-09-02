// Assistente de escolha SUS × Particular: todas as vacinas com decisão
// real numa tela só, com total de dias de visita e injeções recalculado
// em tempo real conforme o usuário mexe nas escolhas. Nada é gravado no
// Firestore até "Salvar" — resolve o problema de mudar a escolha aos
// poucos e esquecer de ressincronizar a Google Agenda depois.

import { useState } from 'react'
import { gerarDosesDaCrianca, agruparPorDiaDeVisita, formatarRotuloInjecoes } from '../utils/calcularCalendario'
import DecisionCard from './DecisionCard.jsx'

export default function EscolhaEsquemaWizard({ crianca, vacinas, onFechar, onSalvar }) {
  const [escolhas, setEscolhas] = useState(crianca.esquemaEscolhido || {})
  const [salvando, setSalvando] = useState(false)

  const dosesStaged = gerarDosesDaCrianca(crianca.dataNascimento, crianca.datasAplicacao || {}, escolhas)
  const diasStaged = agruparPorDiaDeVisita(dosesStaged)
  const totalDias = diasStaged.length
  const totalInjecoes = diasStaged.reduce((acc, d) => acc + d.totalInjecoes, 0)

  async function confirmar() {
    setSalvando(true)
    try {
      await onSalvar(escolhas)
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onFechar}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={puxadorStyle} />
        <button className="tap-scale" onClick={onFechar} style={fecharBtnStyle} aria-label="Fechar">✕</button>

        <div style={{ padding: '4px 22px 0' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, margin: 0 }}>SUS ou particular?</h2>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
            Escolha por vacina — dá pra mudar de novo depois.
          </p>
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 22px 0', flex: 1 }}>
          {vacinas.map((v) => (
            <DecisionCard
              key={v.id}
              vacina={v}
              escolhaAtual={escolhas[v.id]}
              onEscolher={(id, escolha) => setEscolhas((prev) => ({ ...prev, [id]: escolha }))}
            />
          ))}
        </div>

        <div style={totaisStyle}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>
            {totalDias} dias de visita · {formatarRotuloInjecoes(totalInjecoes)} ao todo
          </b>
        </div>

        <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="tap-scale" onClick={confirmar} disabled={salvando} style={btnPrimarioStyle}>
            {salvando ? 'Salvando e sincronizando…' : '📅 Salvar e sincronizar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(51,65,77,0.45)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
}
const sheetStyle = {
  width: '100%', maxWidth: 520, maxHeight: '88vh',
  background: 'var(--bg)', borderRadius: '24px 24px 0 0',
  boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column',
  position: 'relative', animation: 'slideUp 0.25s ease-out',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}
const puxadorStyle = {
  width: 40, height: 4, borderRadius: 100, background: 'var(--line)',
  margin: '10px auto 6px',
}
const fecharBtnStyle = {
  position: 'absolute', top: 12, right: 16, width: 30, height: 30, borderRadius: '50%',
  border: 'none', background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 13,
  cursor: 'pointer', boxShadow: 'var(--shadow-card)',
}
const totaisStyle = {
  padding: '12px 22px', margin: '0 22px', textAlign: 'center',
  borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
}
const btnPrimarioStyle = {
  width: '100%', padding: 14, borderRadius: 14, border: 'none', marginTop: 14,
  background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
}
