// Nota de privacidade, em texto direto (mesmo conteúdo de PRIVACIDADE.md na
// raiz do repositório — mantenha os dois em sincronia se editar um dos dois).

export default function Privacidade({ onFechar }) {
  return (
    <div style={overlayStyle} onClick={onFechar}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={puxadorStyle} />
        <button className="tap-scale" onClick={onFechar} style={fecharBtnStyle} aria-label="Fechar">✕</button>

        <div style={{ padding: '4px 24px 24px', overflowY: 'auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, margin: '0 0 12px' }}>
            Nota de privacidade — versão beta
          </h2>

          <p style={paraStyle}>
            Este app está em fase de <b>beta fechada</b>, com um número pequeno de
            famílias convidadas por formulário.
          </p>

          <p style={paraStyle}>
            <b>O que guardamos:</b> nome e data de nascimento de cada filho
            cadastrado, sexo biológico, quais doses de vacina já foram marcadas
            como aplicadas, seu nome e e-mail de login, e (se você preencher) o
            e-mail do outro responsável — usado só pra convidá-lo(a) nos eventos
            da agenda.
          </p>

          <p style={paraStyle}>
            <b>Quem acessa:</b> só você, com o seu login. Cada conta só enxerga
            os dados dos próprios filhos — não há acesso cruzado entre famílias.
          </p>

          <p style={paraStyle}>
            <b>Google Agenda:</b> se você usar "Sincronizar com Google Agenda",
            criamos eventos na sua própria agenda do Google (não em um
            calendário nosso). O app só usa essa permissão pra criar esses
            eventos, nada mais.
          </p>

          <p style={paraStyle}>
            <b>Notificações push:</b> se você ativar lembretes, guardamos um
            identificador técnico do seu navegador/dispositivo — só usado pra
            enviar os lembretes de vacina, nunca compartilhado.
          </p>

          <p style={paraStyle}>
            <b>Fase de beta:</b> como é uma versão inicial, pode haver bugs ou
            mudanças na estrutura sem aviso prévio. Não é recomendado usar como
            única fonte de controle vacinal — confirme sempre com a caderneta
            física e com o profissional de saúde.
          </p>

          <p style={paraStyle}>
            <b>Conteúdo de vacinas:</b> os campos de reações comuns e
            contraindicações ainda não passaram por revisão de um profissional
            de saúde; onde isso é o caso, o app mostra isso explicitamente em
            vez de apresentar informação não verificada.
          </p>

          <p style={paraStyle}>
            <b>Apagar seus dados:</b> ainda não há exclusão automática pelo
            app — fale com quem te convidou pra beta a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(51,65,77,0.45)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
}
const sheetStyle = {
  width: '100%', maxWidth: 520, maxHeight: '85vh',
  background: 'var(--bg)', borderRadius: '24px 24px 0 0',
  boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column',
  position: 'relative', animation: 'slideUp 0.25s ease-out',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}
const puxadorStyle = {
  width: 40, height: 4, borderRadius: 100, background: 'var(--line)',
  margin: '10px auto 6px',
}
const fecharBtnStyle = {
  position: 'absolute', top: 12, right: 16, width: 30, height: 30, borderRadius: '50%',
  border: 'none', background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 13,
  cursor: 'pointer', boxShadow: 'var(--shadow-card)',
}
const paraStyle = {
  fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 14px', textAlign: 'left',
}
