import { useState } from 'react'
import { doc, collection, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import mascoteBoasVindas from '../assets/mascote-boasvindas.webp'
import AvatarPicker from '../components/AvatarPicker.jsx'

// Formulário de 3 modos, pelo mesmo componente:
// - Primeiro filho de uma conta nova (tela cheia, sem onFechar)
// - Adicionar mais um filho (bottom sheet, contaExiste=true)
// - Editar um filho existente (bottom sheet, com filhoExistente)
export default function CadastroCrianca({ contaExiste, filhoExistente, onSalvo, onFechar }) {
  const [nome, setNome] = useState(filhoExistente?.nome || '')
  const [dataNascimento, setDataNascimento] = useState(filhoExistente?.dataNascimento || '')
  const [sexoBiologico, setSexoBiologico] = useState(filhoExistente?.sexoBiologico || null)
  const [avatar, setAvatar] = useState(filhoExistente?.avatar || 'boasvindas')
  const [cor, setCor] = useState(filhoExistente?.cor || 'blue')
  const [salvando, setSalvando] = useState(false)

  const titulo = filhoExistente ? 'Editar filho' : contaExiste ? 'Adicionar filho' : 'Vamos começar'
  const subtitulo = filhoExistente
    ? 'Atualize os dados quando precisar.'
    : 'Com o nome e a data de nascimento, geramos automaticamente todo o calendário vacinal.'

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)

    const uid = auth.currentUser.uid
    const filhoId = filhoExistente?.id || doc(collection(db, 'criancas', uid, 'filhos')).id

    if (!contaExiste) {
      await setDoc(doc(db, 'criancas', uid), {
        nomeResponsavel: auth.currentUser?.displayName || null,
        emailResponsavel2: null,
        onboardingVisto: false,
        criadoEm: new Date().toISOString(),
      })
    }

    const dadosFilho = {
      nome,
      dataNascimento, // formato ISO 'AAAA-MM-DD'
      sexoBiologico,
      avatar,
      cor,
      ...(filhoExistente
        ? {}
        : {
            datasAplicacao: {}, // { "<vacinaId>_<dose>": "AAAA-MM-DD" } — preenchido quando o pai confirma a data real de cada dose
            esquemaEscolhido: {}, // { vacinaId: 'sus' | 'particular' } — preenchido nas decisões de esquema
            googleEventosSemana: {},
            criadoEm: new Date().toISOString(),
          }),
    }
    await setDoc(doc(db, 'criancas', uid, 'filhos', filhoId), dadosFilho, { merge: !!filhoExistente })

    setSalvando(false)
    onSalvo({ id: filhoId, ...dadosFilho })
    onFechar?.()
  }

  const conteudo = (
    <>
      {!onFechar && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img src={mascoteBoasVindas} alt="" style={{ width: 160, height: 'auto' }} />
        </div>
      )}
      <h1 className="display" style={{ fontSize: 22, textAlign: 'center' }}>{titulo}</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 28, textAlign: 'center' }}>{subtitulo}</p>

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
        <label style={{ fontSize: 12, fontWeight: 600 }}>Sexo biológico</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className="tap-scale"
            onClick={() => setSexoBiologico('feminino')}
            style={toggleStyle(sexoBiologico === 'feminino')}
          >
            Feminino
          </button>
          <button
            type="button"
            className="tap-scale"
            onClick={() => setSexoBiologico('masculino')}
            style={toggleStyle(sexoBiologico === 'masculino')}
          >
            Masculino
          </button>
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10 }}>Avatar</label>
        <div style={{ marginBottom: 22 }}>
          <AvatarPicker avatar={avatar} cor={cor} onMudarAvatar={setAvatar} onMudarCor={setCor} />
        </div>

        <button className="tap-scale" type="submit" disabled={salvando} style={btnPrimary}>
          {salvando ? 'Salvando…' : filhoExistente ? 'Salvar' : 'Gerar calendário vacinal'}
        </button>
      </form>
    </>
  )

  if (onFechar) {
    return (
      <div style={overlayStyle} onClick={onFechar}>
        <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
          <div style={puxadorStyle} />
          <button className="tap-scale" onClick={onFechar} style={fecharBtnStyle} aria-label="Fechar">✕</button>
          <div style={{ padding: '10px 24px 24px', overflowY: 'auto' }}>{conteudo}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '40px 24px' }}>
      {conteudo}
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
function toggleStyle(ativo) {
  return {
    flex: 1, padding: 11, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: '1.5px solid var(--blue-deep)',
    background: ativo ? 'var(--blue-deep)' : '#fff',
    color: ativo ? '#fff' : 'var(--blue-deep)',
  }
}
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(51,65,77,0.45)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
}
const sheetStyle = {
  width: '100%', maxWidth: 480, maxHeight: '90vh',
  background: 'var(--bg)', borderRadius: '24px 24px 0 0',
  boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column',
  position: 'relative', animation: 'slideUp 0.25s ease-out',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}
const puxadorStyle = {
  width: 40, height: 4, borderRadius: 100, background: 'var(--line)',
  margin: '10px auto 0',
}
const fecharBtnStyle = {
  position: 'absolute', top: 12, right: 16, width: 30, height: 30, borderRadius: '50%',
  border: 'none', background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 13,
  cursor: 'pointer', boxShadow: 'var(--shadow-card)',
}
