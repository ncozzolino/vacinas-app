export default function BottomNav({ abaAtiva, onMudar }) {
  const itens = [
    { id: 'home', label: 'Início' },
    { id: 'calendario', label: 'Calendário' },
    { id: 'perfil', label: 'Perfil' },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex',
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--line)', padding: '10px 8px 18px',
    }}>
      {itens.map((item) => {
        const ativo = abaAtiva === item.id
        return (
          <button
            key={item.id}
            className="tap-scale"
            onClick={() => onMudar(item.id)}
            style={{
              flex: 1, border: 'none', background: 'none', padding: 6,
              fontWeight: 700, fontSize: 11, cursor: 'pointer',
              color: ativo ? 'var(--blue-deep)' : 'var(--ink-soft)',
            }}
          >
            <span style={{
              display: 'block', width: 4, height: 4, borderRadius: '50%', margin: '0 auto 5px',
              background: ativo ? 'var(--blue-deep)' : 'transparent',
              transition: 'background-color 0.15s ease',
            }} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
