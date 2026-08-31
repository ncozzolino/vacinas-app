import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import mascoteBoasVindas from '../assets/mascote-boasvindas.webp'

export default function CadastroCrianca({ onSalvo }) {
  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [emailResponsavel2, setEmailResponsavel2] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      nome,
      dataNascimento, // formato ISO 'AAAA-MM-DD'
      emailResponsavel2: emailResponsavel2 || null, // convidado nos eventos do Google Calendar
      datasAplicacao: {}, // { "<vacinaId>_<dose>": "AAAA-MM-DD" } — preenchido quando o pai confirma a data real de cada dose
      esquemaEscolhido: {}, // { vacinaId: 'sus' | 'particular' } — preenchido nas decisões de esquema
      criadoEm: new Date().toISOString(),
    }
    await setDoc(doc(db, 'criancas', auth.currentUser.uid), dados)
    setSalvando(false)
    onSalvo(dados)
    // A geração dos eventos no Google Calendar acontece a partir da tela
    // Calendário (ou pode ser disparada aqui automaticamente — ver
    // netlify/functions/criar-eventos-calendario.js).
  }

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img src={mascoteBoasVindas} alt="" style={{ width: 160, height: 'auto' }} />
      </div>
      <h1 className="display" style={{ fontSize: 22, textAlign: 'center' }}>Vamos começar</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 28, textAlign: 'center' }}>
        Com o nome e a data de nascimento, geramos automaticamente todo o calendário vacinal.
      </p>
      <form onSubmit={salvar}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Nome da criança</label>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={inputStyle}
        />
        <label style={{ fontSize: 12, fontWeight: 600 }}>Data de nascimento</label>
        <input
          type="date"
          required
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
          style={inputStyle}
        />
        <label style={{ fontSize: 12, fontWeight: 600 }}>E-mail do outro responsável (opcional)</label>
        <input
          type="email"
          placeholder="Convidado nos eventos da agenda"
          value={emailResponsavel2}
          onChange={(e) => setEmailResponsavel2(e.target.value)}
          style={inputStyle}
        />
        <button className="tap-scale" type="submit" disabled={salvando} style={btnPrimary}>
          {salvando ? 'Gerando calendário…' : 'Gerar calendário vacinal'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: 12, marginBottom: 18, borderRadius: 14,
  border: '1px solid var(--line)', fontSize: 14,
}
const btnPrimary = {
  width: '100%', padding: 14, borderRadius: 14, border: 'none',
  background: 'var(--ink)', color: '#fff', fontWeight: 700, cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
}
