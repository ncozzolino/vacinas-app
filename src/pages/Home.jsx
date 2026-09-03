import { gerarDosesDaCrianca, agruparPorDiaDeVisita, proximoDiaDeVisita, dosesAtrasadas, paraDataLocal, formatarRotuloInjecoes } from '../utils/calcularCalendario'
import { formatarRotuloDose } from '../components/VaccineDetailSheet.jsx'
import mascoteEspera from '../assets/mascote-espera.webp'
import mascoteComemorando from '../assets/mascote-comemorando.webp'
import mascoteAtencao from '../assets/mascote-atencao.webp'

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function AnelProgresso({ total, feitas, size = 60 }) {
  const pct = total > 0 ? feitas / total : 0
  const raio = size / 2 - 5
  const circunferencia = 2 * Math.PI * raio
  const preenchido = circunferencia * pct

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={raio} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={raio} fill="none"
        stroke="var(--green-deep)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${preenchido} ${circunferencia - preenchido}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.3s ease' }}
      />
    </svg>
  )
}

export default function Home({ crianca, irPara }) {
  const doses = gerarDosesDaCrianca(crianca.dataNascimento, crianca.datasAplicacao || {}, crianca.esquemaEscolhido || {})
  const dias = agruparPorDiaDeVisita(doses)
  const proximo = proximoDiaDeVisita(dias)
  const total = doses.length
  const aplicadas = doses.filter((d) => d.status === 'aplicada')
  const feitas = aplicadas.length
  const emDia = total - feitas === 0
  const atrasadas = dosesAtrasadas(doses)
  const mascote = atrasadas.length > 0 ? mascoteAtencao : emDia ? mascoteComemorando : mascoteEspera
  const historico = [...aplicadas].sort((a, b) => (b.dataAplicacao || '').localeCompare(a.dataAplicacao || '')).slice(0, 3)

  return (
    <div style={{ padding: '34px 20px', maxWidth: 480, margin: '0 auto' }}>
      <p style={{ color: 'var(--ink-soft)', fontSize: 12, fontWeight: 600 }}>{saudacao()}</p>
      <h1 className="display" style={{ fontSize: 20 }}>{crianca.nome}</h1>

      {atrasadas.length > 0 && (
        <div className="tap-scale" style={bannerAtrasoStyle} onClick={() => irPara('calendario')}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.03em', margin: 0, color: 'var(--red-deep)' }}>
            ⚠️ {atrasadas.length} DOSE{atrasadas.length > 1 ? 'S' : ''} ATRASADA{atrasadas.length > 1 ? 'S' : ''}
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: 'var(--red-deep)' }}>
            {atrasadas.slice(0, 3).map((d) => `${d.vacinaNome} (${formatarRotuloDose(d.dose)})`).join(' · ')}
            {atrasadas.length > 3 && ` e mais ${atrasadas.length - 3}`}
          </p>
        </div>
      )}

      <div style={{ ...cardStyle, marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <AnelProgresso total={total} feitas={feitas} size={72} />
        <div style={{ flex: 1 }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 19 }}>{feitas}/{total} doses</b>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
            {emDia ? 'Calendário em dia!' : `${total - feitas} doses restantes`}
          </p>
        </div>
        <img
          src={mascote}
          alt=""
          style={{ width: 72, height: 'auto', flexShrink: 0 }}
        />
      </div>

      {proximo && (
        <div
          className="tap-scale"
          style={{ ...cardStyle, background: 'var(--blue)', marginTop: 16, cursor: 'pointer' }}
          onClick={() => irPara('calendario')}
        >
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.03em', margin: 0 }}>PRÓXIMO DIA DE VACINA</p>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 19, display: 'block', marginTop: 4 }}>
            {proximo.data.toLocaleDateString('pt-BR')} · {formatarRotuloInjecoes(proximo.totalInjecoes)}
          </b>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {proximo.doses.map((d) => (
              <span key={`${d.vacinaId}_${d.dose}`} style={chipStyle}>{d.vacinaNome}</span>
            ))}
          </div>
        </div>
      )}

      {historico.length > 0 ? (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <p style={secaoLabelStyle}>Histórico recente</p>
          {historico.map((d) => (
            <div key={`${d.vacinaId}_${d.dose}`} style={itemHistoricoStyle}>
              <span style={checkHistoricoStyle}>✓</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                  {d.vacinaNome} — {formatarRotuloDose(d.dose)}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--green-deep)', fontWeight: 600 }}>
                  aplicada em {paraDataLocal(d.dataAplicacao).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
          <button className="tap-scale" onClick={() => irPara('calendario')} style={linkVerTudoStyle}>
            Ver calendário completo →
          </button>
        </div>
      ) : (
        <div className="tap-scale" style={{ ...cardStyle, marginTop: 16, cursor: 'pointer' }} onClick={() => irPara('calendario')}>
          <p style={secaoLabelStyle}>Antes da primeira visita</p>
          <p style={{ fontSize: 13.5, color: 'var(--ink)', margin: '4px 0 0' }}>
            Dá uma olhada no calendário sugerido pra ver o que vem por aí →
          </p>
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  background: 'var(--card)', borderRadius: 'var(--radius)', padding: 20,
  boxShadow: 'var(--shadow-card)',
}
const bannerAtrasoStyle = {
  background: 'var(--red-tint)', border: '1px solid var(--red)',
  borderRadius: 16, padding: '12px 16px', marginTop: 14, marginBottom: 16,
  cursor: 'pointer', boxShadow: 'var(--shadow-card)',
}
const chipStyle = {
  background: 'rgba(255,255,255,0.55)', color: 'var(--ink)',
  fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 100,
}
const secaoLabelStyle = {
  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
  color: 'var(--ink-soft)', margin: '0 0 10px',
}
const itemHistoricoStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 8px', margin: '0 -8px 2px', borderRadius: 10, background: 'var(--green-tint)',
}
const checkHistoricoStyle = {
  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--green-deep)',
}
const linkVerTudoStyle = {
  width: '100%', marginTop: 10, padding: 0, border: 'none', background: 'none',
  color: 'var(--blue-deep)', fontWeight: 700, fontSize: 12.5, textAlign: 'left', cursor: 'pointer',
}
