import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import Login from './pages/Login.jsx'
import CadastroCrianca from './pages/CadastroCrianca.jsx'
import Home from './pages/Home.jsx'
import Calendario from './pages/Calendario.jsx'
import Perfil from './pages/Perfil.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = carregando, null = deslogado
  const [crianca, setCrianca] = useState(undefined)
  const [aba, setAba] = useState('home')
  // Access token do Google (para sincronizar com a Agenda) — só vive em memória,
  // nunca persistido; expira em ~1h e é renovado sob demanda em Calendario.jsx.
  const [googleAccessToken, setGoogleAccessToken] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) {
      setCrianca(undefined)
      return
    }
    // onSnapshot em vez de getDoc: qualquer mudança no Firestore (ex: o outro
    // responsável marcando uma dose como aplicada em outro celular) reflete
    // aqui na hora, sem precisar recarregar a página.
    const unsub = onSnapshot(doc(db, 'criancas', user.uid), (snap) => {
      setCrianca(snap.exists() ? snap.data() : null)
    })
    return unsub
  }, [user])

  if (user === undefined) return null // splash simples enquanto carrega
  if (!user) return <Login onGoogleToken={setGoogleAccessToken} />
  if (crianca === null) return <CadastroCrianca onSalvo={() => {}} />
  if (crianca === undefined) return null

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh' }}>
      {aba === 'home' && <Home crianca={crianca} irPara={setAba} />}
      {aba === 'calendario' && (
        <Calendario
          crianca={crianca}
          googleAccessToken={googleAccessToken}
          onGoogleToken={setGoogleAccessToken}
        />
      )}
      {aba === 'perfil' && <Perfil crianca={crianca} />}
      <BottomNav abaAtiva={aba} onMudar={setAba} />
    </div>
  )
}
