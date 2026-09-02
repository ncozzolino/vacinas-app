// Logo do app: rosto do ursinho-doutor (mesmo mascote usado no resto do
// app) num quadrado arredondado azul — mesmo padrão de composição do
// AvatarCrianca, reaproveitado aqui pro ícone da marca.

import logoUrsinho from '../assets/logo-ursinho.webp'

export default function Logo({ size = 72 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size * (20 / 72),
        background: 'var(--blue)', overflow: 'hidden', flexShrink: 0,
      }}
    >
      <img
        src={logoUrsinho}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: size * 0.1 }}
      />
    </div>
  )
}
