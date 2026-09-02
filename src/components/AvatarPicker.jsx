// Escolha de avatar do filho: cor e personagem são dois eixos
// independentes de um toque cada — não 16 combinações pra escolher.

import AvatarCrianca, { MASCOTES, CORES_AVATAR } from './AvatarCrianca.jsx'

const POSES = Object.keys(MASCOTES)

export default function AvatarPicker({ avatar, cor, onMudarAvatar, onMudarCor }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <AvatarCrianca avatar={avatar} cor={cor} size={92} />
      </div>

      <p style={rotuloStyle}>Cor</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 18 }}>
        {CORES_AVATAR.map((c) => (
          <button
            key={c}
            type="button"
            className="tap-scale"
            onClick={() => onMudarCor(c)}
            aria-label={c}
            style={corBtnStyle(c, cor === c)}
          />
        ))}
      </div>

      <p style={rotuloStyle}>Personagem</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {POSES.map((p) => (
          <button
            key={p}
            type="button"
            className="tap-scale"
            onClick={() => onMudarAvatar(p)}
            style={poseBtnStyle(avatar === p)}
          >
            <AvatarCrianca avatar={p} cor={cor} size={50} />
          </button>
        ))}
      </div>
    </div>
  )
}

const rotuloStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textAlign: 'center', margin: '0 0 8px',
}
function corBtnStyle(cor, ativo) {
  return {
    width: 34, height: 34, borderRadius: '50%', padding: 0, cursor: 'pointer',
    background: `var(--${cor})`,
    border: ativo ? `2.5px solid var(--${cor}-deep)` : '2.5px solid transparent',
  }
}
function poseBtnStyle(ativo) {
  return {
    padding: 3, cursor: 'pointer', background: 'none', borderRadius: '50%',
    border: ativo ? '2.5px solid var(--ink)' : '2.5px solid transparent',
  }
}
