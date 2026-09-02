import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, deleteField,
  collection, query, orderBy, onSnapshot,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import Login from './pages/Login.jsx'
import CadastroCrianca from './pages/CadastroCrianca.jsx'
import Home from './pages/Home.jsx'
import Calendario from './pages/Calendario.jsx'
import Perfil from './pages/Perfil.jsx'
import BottomNav from './components/BottomNav.jsx'
import OnboardingInicial from './components/OnboardingInicial.jsx'
import AvatarCrianca from './components/AvatarCrianca.jsx'

// Uma vez por login: se a conta ainda está no formato antigo (1 conta =
// 1 filho, dados direto no doc da conta), migra pra um filho dentro da
// subcoleção `filhos` e limpa os campos antigos do doc da conta. ID fixo
// ("legado") pra rodar de novo sem duplicar caso seja chamado 2x.
async function migrarSeNecessario(uid) {
  const contaRef = doc(db, 'criancas', uid)
  const contaSnap = await getDoc(contaRef)
  if (!contaSnap.exists()) return
  const dados = contaSnap.data()
  if (!('nome' in dados) && !('dataNascimento' in dados)) return // já migrado ou conta nova

  await setDoc(doc(db, 'criancas', uid, 'filhos', 'legado'), {
    nome: dados.nome,
    dataNascimento: dados.dataNascimento,
    sexoBiologico: null, // não existia no formato antigo — convida a editar depois
    avatar: 'boasvindas',
    cor: 'blue',
    datasAplicacao: dados.datasAplicacao || {},
    esquemaEscolhido: dados.esquemaEscolhido || {},
    googleEventosSemana: dados.googleEventosSemana || {},
    criadoEm: dados.criadoEm || new Date().toISOString(),
  })

  await updateDoc(contaRef, {
    nomeResponsavel: auth.currentUser?.displayName || null,
    nome: deleteField(),
    dataNascimento: deleteField(),
    datasAplicacao: deleteField(),
    esquemaEscolhido: deleteField(),
    googleEventosSemana: deleteField(),
  })
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = carregando, null = deslogado
  const [perfil, setPerfil] = useState(undefined) // doc da conta (responsável)
  const [filhos, setFilhos] = useState(undefined) // array de filhos, ordenado por criadoEm
  const [filhoAtivoId, setFilhoAtivoId] = useState(null)
  const [aba, setAba] = useState('home')
  // Access token do Google (para sincronizar com a Agenda) — só vive em memória,
  // nunca persistido; expira em ~1h e é renovado sob demanda em Calendario.jsx.
  const [googleAccessToken, setGoogleAccessToken] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) {
      setPerfil(undefined)
      setFilhos(undefined)
      return
    }

    migrarSeNecessario(user.uid)

    // onSnapshot em vez de getDoc: qualquer mudança no Firestore (ex: o outro
    // responsável marcando uma dose como aplicada em outro celular) reflete
    // aqui na hora, sem precisar recarregar a página.
    const unsubPerfil = onSnapshot(doc(db, 'criancas', user.uid), (snap) => {
      setPerfil(snap.exists() ? snap.data() : null)
    })
    const unsubFilhos = onSnapshot(
      query(collection(db, 'criancas', user.uid, 'filhos'), orderBy('criadoEm')),
      (snap) => {
        setFilhos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }
    )
    return () => {
      unsubPerfil()
      unsubFilhos()
    }
  }, [user])

  // Mantém o filho ativo válido: se o selecionado sumiu (ou nenhum foi
  // escolhido ainda), cai pro primeiro da lista. Só em memória — não
  // precisa lembrar entre sessões, igual a aba ativa.
  useEffect(() => {
    if (!filhos || filhos.length === 0) return
    if (!filhos.some((f) => f.id === filhoAtivoId)) {
      setFilhoAtivoId(filhos[0].id)
    }
  }, [filhos, filhoAtivoId])

  if (user === undefined) return null // splash simples enquanto carrega
  if (!user) return <Login onGoogleToken={setGoogleAccessToken} />
  if (perfil === undefined || filhos === undefined) return null
  if (filhos.length === 0) {
    return <CadastroCrianca contaExiste={perfil !== null} onSalvo={() => {}} />
  }

  const filhoAtivo = filhos.find((f) => f.id === filhoAtivoId) || filhos[0]

  async function fecharOnboarding() {
    await updateDoc(doc(db, 'criancas', user.uid), { onboardingVisto: true })
  }

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh' }}>
      {filhos.length > 1 && (
        <div style={seletorStyle}>
          {filhos.map((f) => (
            <button
              key={f.id}
              className="tap-scale"
              onClick={() => setFilhoAtivoId(f.id)}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
              aria-label={f.nome}
            >
              <AvatarCrianca avatar={f.avatar} cor={f.cor} size={44} ativo={f.id === filhoAtivo.id} />
            </button>
          ))}
        </div>
      )}

      {aba === 'home' && <Home crianca={filhoAtivo} irPara={setAba} />}
      {aba === 'calendario' && (
        <Calendario
          crianca={filhoAtivo}
          filhoId={filhoAtivo.id}
          emailResponsavel2={perfil?.emailResponsavel2}
          googleAccessToken={googleAccessToken}
          onGoogleToken={setGoogleAccessToken}
        />
      )}
      {aba === 'perfil' && (
        <Perfil
          perfil={perfil}
          filhos={filhos}
          filhoAtivoId={filhoAtivo.id}
          onEscolherFilho={setFilhoAtivoId}
        />
      )}
      <BottomNav abaAtiva={aba} onMudar={setAba} />
      {perfil && !perfil.onboardingVisto && <OnboardingInicial onFechar={fecharOnboarding} />}
    </div>
  )
}

const seletorStyle = {
  display: 'flex', gap: 10, padding: '14px 20px 0', overflowX: 'auto',
}
