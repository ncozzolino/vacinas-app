import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export default function Perfil({ crianca }) {
  const [emailResponsavel2, setEmailResponsavel2] = useState(crianca.emailResponsavel2 || '')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  async function salvarEmailResponsavel2() {
    setSalvando(true)
    setSalvo(false)
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      emailResponsavel2: emailResponsavel2 || null,
    })
    setSalvando(false)
    setSalvo(true)
  }

  return (
    <div style={{ padding: '34px 20px' }}>
      <h1 className="display" style={{ fontSize: 20 }}>Perfil</h1>
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{crianca.nome}</b>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: '4px 0 0' }}>
          {new Date(crianca.dataNascimento).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <p style={{ fontSize: 13, margin: 0 }}>{auth.currentUser?.email}</p>
      </div>
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>E-mail do outro responsável</label>
        <input
          type="email"
          placeholder="Convidado nos eventos da agenda"
          value={emailResponsavel2}
          onChange={(e) => { setEmailResponsavel2(e.target.value); setSalvo(false) }}
          style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 12, border: '1px solid var(--line)', fontSize: 13 }}
        />
        <button
          className="tap-scale"
          onClick={salvarEmailResponsavel2}
          disabled={salvando}
          style={{ marginTop: 10, padding: '9px 14px', borderRadius: 12, border: 'none', background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
        >
          {salvando ? 'Salvando…' : salvo ? 'Salvo ✓' : 'Salvar'}
        </button>
      </div>
      <button
        className="tap-scale"
        onClick={() => signOut(auth)}
        style={{ marginTop: 20, width: '100%', padding: 14, borderRadius: 14, border: '1px solid var(--line)', background: '#fff', fontWeight: 600, cursor: 'pointer' }}
      >
        Sair
      </button>
    </div>
  )
}

const cardStyle = { background: 'var(--card)', borderRadius: 18, padding: 18, boxShadow: 'var(--shadow-card)' }
