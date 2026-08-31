// Bottom sheet com o texto real de uma vacina (copy-vacinas-app.json).
// Cada seção só renderiza se o campo correspondente existir — nunca
// inventa conteúdo de saúde pra preencher lacuna (algumas vacinas ainda
// podem não ter todos os campos revisados).

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatarDataCurta(date) {
  return `${date.getDate()} ${MESES_ABREV[date.getMonth()]} ${date.getFullYear()}`
}

export function formatarRotuloDose(dose) {
  if (typeof dose === 'number') return `${dose}ª dose`
  if (dose === 'única') return 'Dose única'
  return dose.charAt(0).toUpperCase() + dose.slice(1)
}

function Secao({ titulo, alerta, children }) {
  return (
    <div style={alerta ? secaoAlertaStyle : secaoStyle}>
      <p style={alerta ? tituloAlertaStyle : tituloStyle}>{titulo}</p>
      {children}
    </div>
  )
}

function Lista({ itens }) {
  return (
    <ul style={listaStyle}>
      {itens.map((item, i) => (
        <li key={i} style={itemStyle}>{item}</li>
      ))}
    </ul>
  )
}

export default function VaccineDetailSheet({ vacina, dose, copy, esquemaLabel, onFechar }) {
  if (!vacina) return null

  const subtitulo = dose
    ? `${formatarRotuloDose(dose.dose)} · sugerida para ${formatarDataCurta(dose.dataPrevista)} · esquema ${esquemaLabel}`
    : vacina.doencas_evitadas?.join(' · ')

  return (
    <div style={overlayStyle} onClick={onFechar}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={puxadorStyle} />
        <button className="tap-scale" onClick={onFechar} style={fecharBtnStyle} aria-label="Fechar">✕</button>

        <div style={{ padding: '4px 22px 0' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, margin: 0 }}>{vacina.nome_sus}</h2>
          {subtitulo && (
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>{subtitulo}</p>
          )}
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 22px 0', flex: 1 }}>
          {copy?.paraQueServe && (
            <Secao titulo="Para que serve">
              <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{copy.paraQueServe}</p>
            </Secao>
          )}

          {copy?.reacoesComuns?.length > 0 && (
            <Secao titulo="Reações comuns">
              <Lista itens={copy.reacoesComuns} />
            </Secao>
          )}

          {copy?.quandoProcurarMedico?.length > 0 && (
            <Secao titulo="Quando procurar um médico" alerta>
              <Lista itens={copy.quandoProcurarMedico} />
            </Secao>
          )}

          {copy?.contraindicacoes?.length > 0 && (
            <Secao titulo="Contraindicações">
              <Lista itens={copy.contraindicacoes} />
            </Secao>
          )}
        </div>

        <p style={rodapeStyle}>
          Informações gerais e educativas. Para orientação específica sobre seu filho, converse sempre com o pediatra.
        </p>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(51,65,77,0.45)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
}
const sheetStyle = {
  width: '100%', maxWidth: 520, maxHeight: '85vh',
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
const secaoStyle = { marginBottom: 18 }
const secaoAlertaStyle = {
  marginBottom: 18, background: 'var(--red-tint)', border: '1px solid var(--red)',
  borderRadius: 14, padding: 13,
}
const tituloStyle = {
  fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
  color: 'var(--ink-soft)', margin: '0 0 8px',
}
const tituloAlertaStyle = { ...tituloStyle, color: 'var(--red-deep)' }
const listaStyle = { margin: 0, padding: '0 0 0 18px' }
const itemStyle = { fontSize: 13.5, lineHeight: 1.5, marginBottom: 4 }
const rodapeStyle = {
  fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.4,
  padding: '14px 22px', margin: 0, borderTop: '1px solid var(--line)', background: 'var(--card)',
}
