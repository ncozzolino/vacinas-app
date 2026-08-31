// Logo do app: coração branco sobre fundo em gradiente azul-esverdeado,
// mesmo estilo validado no mockup.

export default function Logo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--blue)" />
          <stop offset="100%" stopColor="var(--green)" />
        </linearGradient>
      </defs>
      <rect width="72" height="72" rx="20" fill="url(#logoGrad)" />
      <path
        d="M36 54.5C22.5 45.2 14 36.6 14 26.8 14 18.7 20.3 13 27.5 13c4 0 7.6 2 8.5 5.4C36.9 15 40.5 13 44.5 13 51.7 13 58 18.7 58 26.8c0 9.8-8.5 18.4-22 27.7Z"
        fill="#fff"
      />
    </svg>
  )
}
