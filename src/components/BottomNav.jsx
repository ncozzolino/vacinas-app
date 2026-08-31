export default function BottomNav({ abaAtiva, onMudar }) {
  const itens = [
    { id: 'home', label: 'Início' },
    { id: 'calendario', label: 'Calendário' },
    { id: 'perfil', label: 'Perfil' },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex',
      background: 'rgba(255,255,255,0.92)', borderTop: '1px solid var(--line)', padding: '10px 8px 18px',
    }}>
      {itens.map((item) => (
        <button
          key={item.id}
          onClick={() => onMudar(item.id)}
          style={{
            flex: 1, border: 'none', background: 'none', padding: 6,
            fontWeight: 700, fontSize: 11,
            color: abaAtiva === item.id ? 'var(--blue-deep)' : 'var(--ink-soft)',
            cursor: 'pointer',
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
