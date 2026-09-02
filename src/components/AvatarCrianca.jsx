// Identidade visual de um filho: uma das 4 poses do urso, num círculo com
// a cor escolhida — sem precisar de upload de foto (Firebase Storage
// exigiria o plano pago, decisão já tomada de não ativar). A mesma cor
// também vira a cor dos eventos desse filho no Google Agenda.

import mascoteBoasvindas from '../assets/mascote-boasvindas.webp'
import mascoteEspera from '../assets/mascote-espera.webp'
import mascoteComemorando from '../assets/mascote-comemorando.webp'
import mascoteAtencao from '../assets/mascote-atencao.webp'

export const MASCOTES = {
  boasvindas: mascoteBoasvindas,
  espera: mascoteEspera,
  comemorando: mascoteComemorando,
  atencao: mascoteAtencao,
}

export const CORES_AVATAR = ['blue', 'green', 'pink', 'yellow']

export default function AvatarCrianca({ avatar = 'boasvindas', cor = 'blue', size = 48, ativo = false }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: `var(--${cor})`, overflow: 'hidden',
        boxShadow: ativo ? `0 0 0 3px var(--${cor}-deep)` : 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <img
        src={MASCOTES[avatar] || MASCOTES.boasvindas}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: Math.round(size * 0.08) }}
      />
    </div>
  )
}
