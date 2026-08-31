import { gerarDosesDaCrianca, agruparPorDiaDeVisita, proximoDiaDeVisita } from '../utils/calcularCalendario'

export default function Home({ crianca, irPara }) {
  const doses = gerarDosesDaCrianca(crianca.dataNascimento).map((d) => {
    const chave = `${d.vacinaId}_${d.dose}`
    return crianca.dosesConcluidas?.[chave] ? { ...d, status: 'aplicada' } : d
  })
  const dias = agruparPorDiaDeVisita(doses)
  const proximo = proximoDiaDeVisita(dias)
  const total = doses.length
  const feitas = doses.filter((d) => d.status === 'aplicada').length

  return (
    <div style={{ padding: '34px 20px', maxWidth: 480, margin: '0 auto' }}>
      <p style={{ color: 'var(--ink-soft)', fontSize: 12, fontWeight: 600 }}>Boa tarde</p>
      <h1 className="display" style={{ fontSize: 20 }}>{crianca.nome}</h1>

      <div style={cardStyle}>
        <b>{feitas}/{total} doses</b>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
          {total - feitas === 0 ? 'Calendário em dia!' : `${total - feitas} doses restantes`}
        </p>
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
