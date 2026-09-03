import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, deleteField,
  collection, query, orderBy, onSnapshot,
} from 'firebase/firestore'
import { auth, db, ADMIN_EMAIL } from './firebase'
import { registrarEvento } from './utils/eventos'
import Login from './pages/Login.jsx'
import CadastroCrianca from './pages/CadastroCrianca.jsx'
import Home from './pages/Home.jsx'
import Calendario from './pages/Calendario.jsx'
import Perfil from './pages/Perfil.jsx'
import Admin from './pages/Admin.jsx'
import BottomNav from './components/BottomNav.jsx'
import OnboardingInicial from './components/OnboardingInicial.jsx'
import AvatarCrianca from './components/AvatarCrianca.jsx'
import Logo from './components/Logo.jsx'

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
  const [acesso, setAcesso] = useState(undefined) // undefined = carregando, { gateAtivo, emailsPermitidos }
  const [perfil, setPerfil] = useState(undefined) // doc da conta (responsável)
  const [filhos, setFilhos] = useState(undefined) // array de filhos, ordenado por criadoEm
  const [filhoAtivoId, setFilhoAtivoId] = useState(null)
  const [aba, setAba] = useState('home')
  // Access token do Google (para sincronizar com a Agenda) — só vive em memória,
  // nunca persistido; expira em ~1h e é renovado sob demanda em Calendario.jsx.
  const [googleAccessToken, setGoogleAccessToken] = useState(null)
  const [mostrarCadastroFilho, setMostrarCadastroFilho] = useState(false)
  const loginRegistradoRef = useRef(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  // Trava de emergência da beta — desligada por padrão (`gateAtivo: false`),
  // liga manualmente pelo painel de admin se o número de contas passar do
  // esperado. Enquanto desligada, qualquer conta Google entra sem fricção.
  useEffect(() => {
    if (!user) {
      setAcesso(undefined)
      return
    }
    getDoc(doc(db, 'config', 'acesso')).then((snap) => {
      setAcesso(snap.exists() ? snap.data() : { gateAtivo: false, emailsPermitidos: [] })
    })
  }, [user])

  useEffect(() => {
    if (!user || acesso === undefined) return
    const email = (user.email || '').toLowerCase()
    const emailsPermitidos = (acesso.emailsPermitidos || []).map((e) => e.toLowerCase())
    // O admin nunca fica de fora, mesmo que esqueça de incluir o próprio
    // e-mail na lista ao ligar a trava — senão ninguém consegue desligá-la de volta.
    const permitido = acesso.gateAtivo !== true || emailsPermitidos.includes(email) || email === ADMIN_EMAIL.toLowerCase()
    if (!permitido) {
      signOut(auth)
      return
    }
    if (loginRegistradoRef.current !== user.uid) {
      loginRegistradoRef.current = user.uid
      registrarEvento('login', user.uid)
    }
  }, [user, acesso])

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

  if (user === undefined) return <TelaCarregando />
  if (!user) return <Login onGoogleToken={setGoogleAccessToken} />
  if (acesso === undefined) return <TelaCarregando />

  const emailAtual = (user.email || '').toLowerCase()
  const emailsPermitidos = (acesso.emailsPermitidos || []).map((e) => e.toLowerCase())
  const permitido = acesso.gateAtivo !== true || emailsPermitidos.includes(emailAtual) || emailAtual === ADMIN_EMAIL.toLowerCase()
  if (!permitido) return <TelaBetaFechada />

  if (perfil === undefined || filhos === undefined) return <TelaCarregando />
  if (filhos.length === 0) {
    return <CadastroCrianca contaExiste={perfil !== null} onSalvo={() => {}} />
  }

  const filhoAtivo = filhos.find((f) => f.id === filhoAtivoId) || filhos[0]

  async function fecharOnboarding() {
    await updateDoc(doc(db, 'criancas', user.uid), { onboardingVisto: true })
  }

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh' }}>
      <div style={seletorStyle}>
        {filhos.map((f) => (
          <button
            key={f.id}
            className="tap-scale"
            onClick={() => setFilhoAtivoId(f.id)}
            style={{
              border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
              opacity: f.id === filhoAtivo.id ? 1 : 0.6, transition: 'opacity 0.15s ease',
            }}
            aria-label={f.nome}
          >
            <AvatarCrianca avatar={f.avatar} cor={f.cor} size={56} ativo={f.id === filhoAtivo.id} />
          </button>
        ))}
        <button
          className="tap-scale"
          onClick={() => setMostrarCadastroFilho(true)}
          style={btnAdicionarFilhoStyle}
          aria-label="Adicionar filho"
        >
          +
        </button>
      </div>

      {mostrarCadastroFilho && (
        <CadastroCrianca
          contaExiste
          onSalvo={(f) => { setFilhoAtivoId(f.id); setMostrarCadastroFilho(false) }}
          onFechar={() => setMostrarCadastroFilho(false)}
        />
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
          souAdmin={emailAtual === ADMIN_EMAIL.toLowerCase()}
          onAbrirAdmin={() => setAba('admin')}
        />
      )}
      {aba === 'admin' && emailAtual === ADMIN_EMAIL.toLowerCase() && (
        <Admin onVoltar={() => setAba('perfil')} />
      )}
      <BottomNav abaAtiva={aba} onMudar={setAba} />
      {perfil && !perfil.onboardingVisto && <OnboardingInicial onFechar={fecharOnboarding} />}
    </div>
  )
}

const seletorStyle = {
  display: 'flex', gap: 10, padding: '14px 20px 0', overflowX: 'auto', alignItems: 'center',
}
const btnAdicionarFilhoStyle = {
  width: 56, height: 56, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
  border: '1.5px dashed var(--line)', background: 'none', color: 'var(--ink-soft)',
  fontSize: 22, fontWeight: 700, lineHeight: 1,
}

function TelaCarregando() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="tap-scale" style={{ animation: 'popIn 0.6s ease-in-out infinite alternate' }}>
        <Logo size={56} />
      </div>
    </div>
  )
}

function TelaBetaFechada() {
  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <Logo />
      </div>
      <h1 className="display" style={{ fontSize: 20 }}>Beta fechada temporariamente</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 10 }}>
        Essa versão está com o número de famílias convidadas completo no momento.
        Se você preencheu o formulário, seu acesso é liberado em breve.
      </p>
    </div>
  )
}
