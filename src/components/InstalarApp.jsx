// Atalho pra instalar o app na tela de início — funciona de verdade (com um
// toque) no Android/Chrome/Edge via `beforeinstallprompt`. No iPhone/Safari
// não existe API pra isso (limitação da Apple, não nossa), então mostramos
// o caminho manual só ali. Se o app já estiver instalado, não mostra nada.

import { useEffect, useState } from 'react'

export default function InstalarApp() {
  const [promptEvento, setPromptEvento] = useState(null)
  const [jaInstalado, setJaInstalado] = useState(true) // true até confirmar o contrário, evita "piscar"

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    setJaInstalado(standalone)

    function handler(e) {
      e.preventDefault()
      setPromptEvento(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (jaInstalado) return null

  async function instalar() {
    if (!promptEvento) return
    promptEvento.prompt()
    const escolha = await promptEvento.userChoice
    if (escolha.outcome === 'accepted') setJaInstalado(true)
    setPromptEvento(null)
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream

  if (!promptEvento && !isIOS) return null // sem caminho de instalação nesse navegador

  return (
    <div style={cardStyle}>
      <label style={{ fontSize: 12, fontWeight: 600 }}>Instale o app</label>
      <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '2px 0 10px' }}>
        Funciona como um app de verdade, com ícone na tela de início — e é o que faz os lembretes de vacina chegarem certinho no celular.
      </p>

      {promptEvento && (
        <button className="tap-scale" onClick={instalar} style={btnStyle}>
          Instalar app
        </button>
      )}

      {!promptEvento && isIOS && (
        <p style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
          Toque em <b>Compartilhar</b> (o ícone ⬆️ na barra do Safari) e depois em{' '}
          <b>"Adicionar à Tela de Início"</b>.
        </p>
      )}
    </div>
  )
}

const cardStyle = { background: 'var(--card)', borderRadius: 18, padding: 18, boxShadow: 'var(--shadow-card)', marginTop: 12 }
const btnStyle = {
  padding: '9px 14px', borderRadius: 12, border: 'none',
  background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
}
