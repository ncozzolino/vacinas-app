import { useRef, useState } from 'react'
import { signOut, updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../firebase'
import { paraDataLocal } from '../utils/calcularCalendario'

export default function Perfil({ crianca }) {
  const [emailResponsavel2, setEmailResponsavel2] = useState(crianca.emailResponsavel2 || '')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [foto, setFoto] = useState(auth.currentUser?.photoURL || null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const inputFotoRef = useRef(null)

  async function salvarEmailResponsavel2() {
    setSalvando(true)
    setSalvo(false)
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      emailResponsavel2: emailResponsavel2 || null,
    })
    setSalvando(false)
    setSalvo(true)
  }

  async function trocarFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!arquivo || !arquivo.type.startsWith('image/')) return

    setEnviandoFoto(true)
    try {
      const caminho = ref(storage, `avatars/${auth.currentUser.uid}`)
      await uploadBytes(caminho, arquivo)
      const url = await getDownloadURL(caminho)
      await updateProfile(auth.currentUser, { photoURL: url })
      setFoto(url)
    } catch {
      // upload falhou (ex: Storage ainda não habilitado no Firebase) — mantém a foto anterior
    } finally {
      setEnviandoFoto(false)
    }
  }

  const inicial = (crianca.nome || auth.currentUser?.email || '?').charAt(0).toUpperCase()

  return (
    <div style={{ padding: '34px 20px', maxWidth: 480, margin: '0 auto' }}>
      <h1 className="display" style={{ fontSize: 20 }}>Perfil</h1>
      <div style={{ ...cardStyle, marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {foto ? (
            <img src={foto} alt="" referrerPolicy="no-referrer" style={avatarStyle} />
          ) : (
            <div style={{ ...avatarStyle, ...avatarFallbackStyle }}>{inicial}</div>
          )}
          <button
            className="tap-scale"
            onClick={() => inputFotoRef.current?.click()}
            disabled={enviandoFoto}
            aria-label="Trocar foto"
            style={editBadgeStyle}
          >
            {enviandoFoto ? '…' : '✎'}
          </button>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            onChange={trocarFoto}
            style={{ display: 'none' }}
          />
        </div>
        <div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{crianca.nome}</b>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: '4px 0 0' }}>
            {paraDataLocal(crianca.dataNascimento).toLocaleDateString('pt-BR')}
          </p>
        </div>
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
const avatarStyle = { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }
const avatarFallbackStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--blue)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
}
const editBadgeStyle = {
  position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%',
  border: '2px solid var(--card)', background: 'var(--ink)', color: '#fff',
  fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0,
}
