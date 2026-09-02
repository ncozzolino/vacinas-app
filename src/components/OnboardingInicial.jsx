// Explicação inicial de como usar o app — some sozinha depois de fechada
// (crianca.onboardingVisto no Firestore) e não volta a aparecer. Mostrada
// tanto pra cadastros novos quanto, retroativamente, pra quem já tinha
// conta antes dela existir (não é presa à tela de Cadastro).

import mascoteBoasVindas from '../assets/mascote-boasvindas.webp'

const PASSOS = [
  'Na tela inicial você vê a próxima visita marcada e se há alguma injeção atrasada.',
  'Se houver diferença entre o esquema SUS e o particular pra alguma vacina, você escolhe qual seguir — isso pode mudar as datas e o número de injeções.',
  'Depois de decidir, sincronize com sua Agenda Google pra não esquecer nenhuma visita.',
]

export default function OnboardingInicial({ onFechar }) {
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <img src={mascoteBoasVindas} alt="" style={{ width: 130, height: 'auto', margin: '0 auto 8px', display: 'block' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, textAlign: 'center', margin: '0 0 18px' }}>
          Como funciona
        </h2>
        <ol style={{ margin: 0, padding: '0 0 0 20px' }}>
          {PASSOS.map((passo, i) => (
            <li key={i} style={itemStyle}>{passo}</li>
          ))}
        </ol>
        <button className="tap-scale" onClick={onFechar} style={btnStyle}>
          Entendi
        </button>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(51,65,77,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, zIndex: 200, animation: 'fadeIn 0.2s ease-out',
}
const cardStyle = {
  background: 'var(--bg)', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 360,
  boxShadow: 'var(--shadow-card)', animation: 'popIn 0.25s ease-out',
}
const itemStyle = {
  fontSize: 13.5, lineHeight: 1.5, marginBottom: 12, color: 'var(--ink)',
}
const btnStyle = {
  width: '100%', padding: 14, borderRadius: 14, border: 'none', marginTop: 8,
  background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
}
