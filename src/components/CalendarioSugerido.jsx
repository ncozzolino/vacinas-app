// Aba "Calendário sugerido": referência oficial do PNI, organizada como
// linha do tempo por marco de idade (Ao nascer, 2 meses, ...) — sem
// depender da data de nascimento da criança. Cada vacina com diferença
// real entre SUS e particular mostra as duas grades lado a lado.

function agruparPorMarco(vacinas) {
  const grupos = []
  let atual = null
  for (const v of vacinas) {
    const label = v.esquema_sus[0]?.idade_label || '—'
    if (!atual || atual.label !== label) {
      atual = { label, vacinas: [] }
      grupos.push(atual)
    }
    atual.vacinas.push(v)
  }
  return grupos
}

function rotuloInjecoes(vacina) {
  const viaOral = vacina.via_administracao?.toLowerCase().includes('oral')
  const total = vacina.esquema_sus.length
  if (viaOral) return total > 1 ? `${total}x, via oral` : 'Via oral'
  if (total === 1) return 'Dose única'
  return `${total} injeções ao todo`
}

function resumoDatas(itens) {
  return itens.map((i) => i.idade_label).join(' · ')
}

export default function CalendarioSugerido({ vacinas, esquemaEscolhido, onSelecionar }) {
  const grupos = agruparPorMarco(vacinas)

  return (
    <div style={{ marginTop: 4 }}>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '12px 0 20px' }}>
        Referência oficial do PNI. Mostra o que é cada vacina, para que serve e
        quantas doses tem — sem depender da data de nascimento.
      </p>

      {grupos.map((grupo, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
            <span style={pontoStyle} />
            {i < grupos.length - 1 && <span style={linhaStyle} />}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingBottom: 22 }}>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink-soft)' }}>
              {grupo.label}
            </b>

            {grupo.vacinas.map((v) => {
              const impacto = v.impacto_particular
              const temComparacao = !!impacto
              const escolha = esquemaEscolhido?.[v.id] || (temComparacao ? 'sus' : null)
              return (
                <div
                  key={v.id}
                  className="tap-scale"
                  style={{ ...cardStyle, cursor: 'pointer' }}
                  onClick={() => onSelecionar(v)}
                >
                  <b style={{ fontFamily: 'var(--font-display)', fontSize: 15.5 }}>{v.nome_sus}</b>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '4px 0 10px', lineHeight: 1.4 }}>
                    {v.doencas_evitadas.join(', ')}
                  </p>
                  <span style={pillStyle}>{rotuloInjecoes(v)}</span>

                  {temComparacao && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <div style={{ ...colunaStyle, background: 'var(--blue-tint)' }}>
                        <p style={colunaLabelStyle}>{escolha === 'sus' && '✓ '}SUS</p>
                        <p style={colunaTextoStyle}>{resumoDatas(v.esquema_sus)}</p>
                      </div>
                      <div style={{ ...colunaStyle, background: 'var(--amber-tint)' }}>
                        <p style={{ ...colunaLabelStyle, color: 'var(--amber-deep)' }}>{escolha === 'particular' && '✓ '}PARTICULAR</p>
                        <p style={colunaTextoStyle}>
                          {impacto.doses_particular
                            ? resumoDatas(impacto.doses_particular)
                            : (impacto.resumo || v.esquema_particular?.nota_preliminar)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const pontoStyle = {
  width: 10, height: 10, borderRadius: '50%', background: 'var(--blue-deep)', flexShrink: 0,
}
const linhaStyle = {
  width: 2, flex: 1, background: 'var(--line)', marginTop: 4,
}
const cardStyle = {
  background: 'var(--card)', borderRadius: 18, padding: 16, marginTop: 10,
  boxShadow: 'var(--shadow-card)',
}
const pillStyle = {
  display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '4px 10px',
  borderRadius: 100, background: 'var(--green-tint)', color: 'var(--green-deep)',
}
const colunaStyle = { flex: 1, borderRadius: 12, padding: '9px 10px', minWidth: 0 }
const colunaLabelStyle = {
  fontSize: 9, fontWeight: 800, letterSpacing: '.05em', margin: 0,
  color: 'var(--blue-deep)',
}
const colunaTextoStyle = { fontSize: 11, lineHeight: 1.4, margin: '4px 0 0' }
