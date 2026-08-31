// Card de decisão: aparece quando uma vacina tem uma diferença real entre
// o esquema SUS e o particular (ex: Penta separada × Hexavalente combinada).
// A escolha do usuário é só salva como preferência (`esquemaEscolhido`) —
// IMPORTANTE: as DATAS de cada dose continuam calculadas com base no
// esquema SUS, porque é o único com idade-alvo estruturada na nossa base
// (`esquema_particular` na base de dados hoje só tem uma nota textual, não
// idades por dose). Ver observação no README sobre isso.

export default function DecisionCard({ vacina, escolhaAtual, onEscolher }) {
  if (!vacina.esquema_particular?.nota_preliminar) return null

  const escolha = escolhaAtual || 'sus'

  return (
    <div style={cardStyle}>
      <p style={labelStyle}>Decisão de esquema</p>
      <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{vacina.nome_sus}</b>
      <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: '6px 0 12px' }}>
        {vacina.esquema_particular.nota_preliminar}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onEscolher(vacina.id, 'sus')}
          style={optStyle(escolha === 'sus')}
        >
          SUS
        </button>
        <button
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
  background: 'var(--amber-tint)', border: '1px solid #E8C596',
  borderRadius: 16, padding: 15, marginBottom: 14,
}
const labelStyle = {
  fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '.05em', color: 'var(--amber-deep)', margin: 0,
}
function optStyle(ativo) {
  return {
    flex: 1, border: '1.5px solid var(--amber-deep)', borderRadius: 10,
    padding: '8px 4px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
    background: ativo ? 'var(--amber-deep)' : '#fff',
    color: ativo ? '#fff' : 'var(--amber-deep)',
  }
}
