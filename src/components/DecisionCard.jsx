// Conteúdo de uma decisão de esquema (SUS x Particular) para uma vacina.
// Usado dentro da seção "Decisões de esquema" em Calendario.jsx, que já
// controla o colapso/expansão do grupo inteiro — este componente sempre
// renderiza aberto.

export default function DecisionCard({ vacina, escolhaAtual, onEscolher }) {
  if (!vacina.esquema_particular?.nota_preliminar) return null

  const escolha = escolhaAtual || 'sus'

  return (
    <div style={cardStyle}>
      <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{vacina.nome_sus}</b>
      <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: '6px 0 12px' }}>
        {vacina.esquema_particular.nota_preliminar}
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
function optStyle(ativo) {
  return {
    flex: 1, border: '1.5px solid var(--amber-deep)', borderRadius: 10,
    padding: '8px 4px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
    background: ativo ? 'var(--amber-deep)' : '#fff',
    color: ativo ? '#fff' : 'var(--amber-deep)',
  }
}
