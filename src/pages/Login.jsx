import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import Logo from '../components/Logo.jsx'
import Privacidade from '../components/Privacidade.jsx'

// Fase de lançamento: só login por Google (mais simples, sem depender de
// "esqueci minha senha"). O login por e-mail/senha continua implementado
// abaixo — é só reativar esta constante quando entrar no roadmap.
const LOGIN_EMAIL_ATIVO = false

export default function Login({ onGoogleToken }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [privacidadeAberta, setPrivacidadeAberta] = useState(false)

  async function entrarComEmail(e) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch {
      // Se não existir conta, cria uma — simplifica o fluxo de primeiro acesso.
      try {
        await createUserWithEmailAndPassword(auth, email, senha)
      } catch (e2) {
        setErro('Não foi possível entrar. Confira o e-mail e a senha.')
      }
    }
    setCarregando(false)
  }

  async function entrarComGoogle() {
    setErro(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) onGoogleToken?.(credential.accessToken)
    } catch {
      setErro('Não foi possível entrar com o Google.')
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <Logo />
      </div>
      <h1 className="display" style={{ fontSize: 24 }}>Vacina em Dia</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32 }}>Calendário vacinal, sem esforço</p>

      {LOGIN_EMAIL_ATIVO && (
        <form onSubmit={entrarComEmail} style={{ textAlign: 'left' }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={inputStyle}
          />
          {erro && <p style={{ color: '#B2472C', fontSize: 13 }}>{erro}</p>}
          <button className="tap-scale" type="submit" disabled={carregando} style={btnPrimary}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      )}

      {!LOGIN_EMAIL_ATIVO && erro && (
        <p style={{ color: '#B2472C', fontSize: 13, marginBottom: 12 }}>{erro}</p>
      )}

      <button className="tap-scale" onClick={entrarComGoogle} style={btnGoogle}>Entrar com Google</button>

      <button
        className="tap-scale"
        onClick={() => setPrivacidadeAberta(true)}
        style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 12, marginTop: 24, cursor: 'pointer', textDecoration: 'underline' }}
      >
        Política de privacidade
      </button>

      {privacidadeAberta && <Privacidade onFechar={() => setPrivacidadeAberta(false)} />}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: 12, marginBottom: 14, borderRadius: 14,
  border: '1px solid var(--line)', fontSize: 14,
}
const btnPrimary = {
  width: '100%', padding: 14, borderRadius: 14, border: 'none',
  background: 'var(--ink)', color: '#fff', fontWeight: 700, cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
}
const btnGoogle = {
  width: '100%', padding: 13, borderRadius: 14, border: '1px solid var(--line)',
  background: '#fff', fontWeight: 600, marginTop: 16, cursor: 'pointer',
}
