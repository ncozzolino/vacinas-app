import { gerarDosesDaCrianca, agruparPorDiaDeVisita, proximoDiaDeVisita, dosesAtrasadas } from '../utils/calcularCalendario'
import { formatarRotuloDose } from '../components/VaccineDetailSheet.jsx'
import mascoteEspera from '../assets/mascote-espera.webp'
import mascoteComemorando from '../assets/mascote-comemorando.webp'

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
  const feitas = doses.filter((d) => d.status === 'aplicada').length
  const emDia = total - feitas === 0
  const atrasadas = dosesAtrasadas(doses)

  return (
    <div style={{ padding: '34px 20px', maxWidth: 480, margin: '0 auto' }}>
      <p style={{ color: 'var(--ink-soft)', fontSize: 12, fontWeight: 600 }}>Boa tarde</p>
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

      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
        <AnelProgresso total={total} feitas={feitas} />
        <div style={{ flex: 1 }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{feitas}/{total} doses</b>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
            {emDia ? 'Calendário em dia!' : `${total - feitas} doses restantes`}
          </p>
        </div>
        <img
          src={emDia ? mascoteComemorando : mascoteEspera}
          alt=""
          style={{ width: 52, height: 'auto', flexShrink: 0 }}
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
            {proximo.data.toLocaleDateString('pt-BR')} · {proximo.totalPicadas} picada{proximo.totalPicadas > 1 ? 's' : ''}
          </b>
          <p style={{ fontSize: 12, marginTop: 6, margin: '6px 0 0' }}>
            {proximo.doses.map((d) => d.vacinaNome).join(' · ')}
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
