// Conteúdo de uma decisão de esquema (SUS x Particular) para uma vacina.
// Usado dentro da seção "Decisões de esquema" em Calendario.jsx, que já
// controla o colapso/expansão do grupo inteiro — este componente sempre
// renderiza aberto.

export default function DecisionCard({ vacina, escolhaAtual, onEscolher }) {
  const impacto = vacina.impacto_particular
  const descricao = impacto?.resumo || vacina.esquema_particular?.nota_preliminar
  if (!descricao) return null

  const escolha = escolhaAtual || 'sus'
  // Calculado a partir dos arrays reais de doses — não do texto livre de
  // `resumo`, que pode estar desatualizado (ex: hepatite B tem
  // altera_datas_ou_doses:true mas doses_particular idêntico ao SUS).
  const dosesParticular = impacto?.doses_particular
  const mudaQtdInjecoes = dosesParticular && dosesParticular.length !== vacina.esquema_sus.length

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{vacina.nome_sus}</b>
        {impacto?.altera_datas_ou_doses && <span style={seloStyle}>📅 muda as datas</span>}
        {mudaQtdInjecoes && <span style={seloDiffStyle}>🔢 muda o número de injeções</span>}
      </div>
      <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: '6px 0 12px' }}>
        {descricao}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="tap-scale"
          onClick={() => onEscolher(vacina.id, 'sus')}
          style={optStyle(escolha === 'sus')}
        >
          SUS
        </button>
        <button
          className="tap-scale"
          onClick={() => onEscolher(vacina.id, 'particular')}
          style={optStyle(escolha === 'particular')}
        >
          Particular
        </button>
      </div>
    </div>
  )
}

const cardStyle = {
  background: '#fff', border: '1px solid var(--line)',
  borderRadius: 14, padding: 13, marginBottom: 8,
}
const seloStyle = {
  fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 100,
  background: 'var(--blue-tint)', color: 'var(--blue-deep)', whiteSpace: 'nowrap',
}
const seloDiffStyle = {
  fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 100,
  background: 'var(--green-tint)', color: 'var(--green-deep)', whiteSpace: 'nowrap',
}
function optStyle(ativo) {
  return {
    flex: 1, border: '1.5px solid var(--amber-deep)', borderRadius: 10,
    padding: '8px 4px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
    background: ativo ? 'var(--amber-deep)' : '#fff',
    color: ativo ? '#fff' : 'var(--amber-deep)',
  }
}
