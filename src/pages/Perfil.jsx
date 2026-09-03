import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { paraDataLocal } from '../utils/calcularCalendario'
import { ativarNotificacoes, statusNotificacoes } from '../utils/pushNotifications'
import AvatarCrianca from '../components/AvatarCrianca.jsx'
import InstalarApp from '../components/InstalarApp.jsx'
import CadastroCrianca from './CadastroCrianca.jsx'

// Troca de foto própria (upload) fica pra depois — exige o plano Blaze do
// Firebase (Storage não é mais gratuito), decisão do usuário, não tomada
// ainda. Por enquanto só mostra a foto da conta Google quando existe.

const ROTULO_SEXO = { feminino: 'Feminino', masculino: 'Masculino' }

export default function Perfil({ perfil, filhos, filhoAtivoId, onEscolherFilho, souAdmin, onAbrirAdmin }) {
  const [nomeResponsavel, setNomeResponsavel] = useState(perfil?.nomeResponsavel || '')
  const [emailResponsavel2, setEmailResponsavel2] = useState(perfil?.emailResponsavel2 || '')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  // Só começa aberto se ainda não tem valor salvo — quem já preencheu vê o
  // resumo primeiro, e só reabre o campo se tocar em editar.
  const [editandoNome, setEditandoNome] = useState(!perfil?.nomeResponsavel)
  const [editandoEmail, setEditandoEmail] = useState(!perfil?.emailResponsavel2)
  const [sheetAberto, setSheetAberto] = useState(null) // null | 'novo' | { ...filho }
  const [statusNotif, setStatusNotif] = useState(null)
  const [ativandoNotif, setAtivandoNotif] = useState(false)

  useEffect(() => {
    statusNotificacoes().then(setStatusNotif)
  }, [])

  async function handleAtivarNotificacoes() {
    setAtivandoNotif(true)
    const resultado = await ativarNotificacoes()
    setStatusNotif(resultado)
    setAtivandoNotif(false)
  }

  async function salvarNomeResponsavel() {
    setSalvandoNome(true)
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      nomeResponsavel: nomeResponsavel || null,
    })
    setSalvandoNome(false)
    setEditandoNome(false)
  }

  async function salvarEmailResponsavel2() {
    setSalvandoEmail(true)
    await updateDoc(doc(db, 'criancas', auth.currentUser.uid), {
      emailResponsavel2: emailResponsavel2 || null,
    })
    setSalvandoEmail(false)
    setEditandoEmail(false)
  }

  const foto = auth.currentUser?.photoURL
  const inicial = (perfil?.nomeResponsavel || auth.currentUser?.email || '?').charAt(0).toUpperCase()

  return (
    <div style={{ padding: '34px 20px', maxWidth: 480, margin: '0 auto' }}>
      <h1 className="display" style={{ fontSize: 20 }}>Perfil</h1>

      <div style={{ ...cardStyle, marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        {foto ? (
          <img src={foto} alt="" referrerPolicy="no-referrer" style={avatarStyle} />
        ) : (
          <div style={{ ...avatarStyle, ...avatarFallbackStyle }}>{inicial}</div>
        )}
        <div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
            {perfil?.nomeResponsavel || 'Responsável'}
          </b>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: '4px 0 0' }}>
            {auth.currentUser?.email}
          </p>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 12 }}>
        {editandoNome ? (
          <>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Seu nome</label>
            <input
              value={nomeResponsavel}
              onChange={(e) => setNomeResponsavel(e.target.value)}
              style={campoStyle}
            />
            <button className="tap-scale" onClick={salvarNomeResponsavel} disabled={salvandoNome} style={btnSalvarStyle}>
              {salvandoNome ? 'Salvando…' : 'Salvar'}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Seu nome</label>
              <p style={{ fontSize: 14, margin: '4px 0 0' }}>{nomeResponsavel}</p>
            </div>
            <button className="tap-scale" onClick={() => setEditandoNome(true)} style={btnEditarStyle} aria-label="Editar">
              ✎
            </button>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, marginTop: 12 }}>
        {editandoEmail ? (
          <>
            <label style={{ fontSize: 12, fontWeight: 600 }}>E-mail do outro responsável</label>
            <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '2px 0 8px' }}>
              Convidado nos eventos de todos os filhos da conta.
            </p>
            <input
              type="email"
              placeholder="Convidado nos eventos da agenda"
              value={emailResponsavel2}
              onChange={(e) => setEmailResponsavel2(e.target.value)}
              style={campoStyle}
            />
            <button className="tap-scale" onClick={salvarEmailResponsavel2} disabled={salvandoEmail} style={btnSalvarStyle}>
              {salvandoEmail ? 'Salvando…' : 'Salvar'}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>E-mail do outro responsável</label>
              <p style={{ fontSize: 14, margin: '4px 0 0' }}>{emailResponsavel2}</p>
            </div>
            <button className="tap-scale" onClick={() => setEditandoEmail(true)} style={btnEditarStyle} aria-label="Editar">
              ✎
            </button>
          </div>
        )}
      </div>

      <InstalarApp />

      <div style={{ ...cardStyle, marginTop: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Notificações</label>
        <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '2px 0 8px' }}>
          Lembrete 1 semana e 1 dia antes de cada semana de vacinação — funciona mesmo com o app fechado.
        </p>
        {statusNotif === 'nao-suportado' && (
          <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Seu navegador não suporta notificações.</p>
        )}
        {statusNotif === 'negado' && (
          <p style={{ fontSize: 12, color: '#B2472C' }}>Bloqueadas — libere nas configurações do navegador.</p>
        )}
        {statusNotif === 'ativo' && (
          <p style={{ fontSize: 12, color: 'var(--green-deep)', fontWeight: 600 }}>Notificações ativadas ✓</p>
        )}
        {statusNotif === 'pendente' && (
          <button className="tap-scale" onClick={handleAtivarNotificacoes} disabled={ativandoNotif} style={btnSalvarStyle}>
            {ativandoNotif ? 'Ativando…' : 'Ativar lembretes de vacina'}
          </button>
        )}
      </div>

      <p style={secaoLabelStyle}>Filhos</p>
      {filhos.map((f) => (
        <div key={f.id} style={{ ...cardStyle, marginTop: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            className="tap-scale"
            onClick={() => onEscolherFilho?.(f.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, cursor: 'pointer', minWidth: 0 }}
          >
            <AvatarCrianca avatar={f.avatar} cor={f.cor} size={48} ativo={f.id === filhoAtivoId} />
            <div style={{ minWidth: 0 }}>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{f.nome}</b>
              <p style={{ color: 'var(--ink-soft)', fontSize: 12.5, margin: '2px 0 0' }}>
                {paraDataLocal(f.dataNascimento).toLocaleDateString('pt-BR')}
                {f.sexoBiologico && ` · ${ROTULO_SEXO[f.sexoBiologico] || f.sexoBiologico}`}
              </p>
            </div>
          </div>
          <button className="tap-scale" onClick={() => setSheetAberto(f)} style={btnEditarStyle} aria-label="Editar">
            ✎
          </button>
        </div>
      ))}

      <button className="tap-scale" onClick={() => setSheetAberto('novo')} style={btnAdicionarStyle}>
        + Adicionar filho
      </button>

      {souAdmin && (
        <button
          className="tap-scale"
          onClick={onAbrirAdmin}
          style={{ marginTop: 20, width: '100%', padding: 13, borderRadius: 14, border: '1px solid var(--line)', background: 'none', color: 'var(--ink-soft)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          Painel de administração
        </button>
      )}

      <button
        className="tap-scale"
        onClick={() => signOut(auth)}
        style={{ marginTop: 12, width: '100%', padding: 14, borderRadius: 14, border: '1px solid var(--line)', background: '#fff', fontWeight: 600, cursor: 'pointer' }}
      >
        Sair
      </button>

      {sheetAberto && (
        <CadastroCrianca
          contaExiste
          filhoExistente={sheetAberto === 'novo' ? null : sheetAberto}
          onSalvo={(f) => onEscolherFilho?.(f.id)}
          onFechar={() => setSheetAberto(null)}
        />
      )}
    </div>
  )
}

const cardStyle = { background: 'var(--card)', borderRadius: 18, padding: 18, boxShadow: 'var(--shadow-card)' }
const avatarStyle = { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }
const avatarFallbackStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--blue)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
}
const campoStyle = {
  width: '100%', padding: 10, marginTop: 8, borderRadius: 12, border: '1px solid var(--line)', fontSize: 13,
}
const btnSalvarStyle = {
  marginTop: 10, padding: '9px 14px', borderRadius: 12, border: 'none',
  background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
}
const secaoLabelStyle = {
  fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
  color: 'var(--ink-soft)', margin: '24px 0 10px',
}
const btnEditarStyle = {
  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, border: '1px solid var(--line)',
  background: '#fff', color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer',
}
const btnAdicionarStyle = {
  width: '100%', padding: 13, borderRadius: 14, border: '1.5px dashed var(--line)', marginTop: 12,
  background: 'none', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
