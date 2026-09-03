// Painel só pro e-mail admin (ver ADMIN_EMAIL em firebase.js e a checagem
// de acesso em App.jsx — esta página nunca é montada pra outra conta).

import { useEffect, useState } from 'react'
import {
  collection, collectionGroup, doc, getDoc, getDocs,
  getCountFromServer, query, where, setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { formatarDataISO, somarDias } from '../utils/calcularCalendario'

const DIAS_JANELA = 14

export default function Admin({ onVoltar }) {
  const [totais, setTotais] = useState(null) // { contas, criancas }
  const [porDia, setPorDia] = useState(null) // [{ dia, login, sync_calendario }]
  const [acesso, setAcesso] = useState(null) // { gateAtivo, emailsPermitidos }
  const [emailsTexto, setEmailsTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const [contasSnap, criancasSnap] = await Promise.all([
      getCountFromServer(collection(db, 'criancas')),
      getCountFromServer(collectionGroup(db, 'filhos')),
    ])
    setTotais({ contas: contasSnap.data().count, criancas: criancasSnap.data().count })

    const hoje = new Date()
    const dias = Array.from({ length: DIAS_JANELA }, (_, i) => formatarDataISO(somarDias(hoje, i - (DIAS_JANELA - 1))))
    const mapa = Object.fromEntries(dias.map((dia) => [dia, { dia, login: 0, sync_calendario: 0 }]))

    const desde = dias[0]
    const eventosSnap = await getDocs(query(collection(db, 'eventosApp'), where('dia', '>=', desde)))
    for (const d of eventosSnap.docs) {
      const { tipo, dia } = d.data()
      if (mapa[dia] && (tipo === 'login' || tipo === 'sync_calendario')) mapa[dia][tipo]++
    }
    setPorDia(dias.map((dia) => mapa[dia]))

    const acessoSnap = await getDoc(doc(db, 'config', 'acesso'))
    const dadosAcesso = acessoSnap.exists() ? acessoSnap.data() : { gateAtivo: false, emailsPermitidos: [] }
    setAcesso(dadosAcesso)
    setEmailsTexto((dadosAcesso.emailsPermitidos || []).join('\n'))
  }

  async function salvarAcesso(gateAtivo) {
    setSalvando(true)
    setSalvo(false)
    const emailsPermitidos = emailsTexto.split('\n').map((e) => e.trim()).filter(Boolean)
    const novoAcesso = { gateAtivo, emailsPermitidos }
    await setDoc(doc(db, 'config', 'acesso'), novoAcesso, { merge: true })
    setAcesso(novoAcesso)
    setSalvando(false)
    setSalvo(true)
  }

  const maxDia = porDia ? Math.max(1, ...porDia.map((d) => Math.max(d.login, d.sync_calendario))) : 1

  return (
    <div style={{ padding: '34px 20px 100px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="display" style={{ fontSize: 20 }}>Administração</h1>
        <button className="tap-scale" onClick={onVoltar} style={btnVoltarStyle}>Voltar</button>
      </div>

      {!totais && <p style={{ color: 'var(--ink-soft)', marginTop: 20 }}>Carregando…</p>}

      {totais && (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <div style={cardNumeroStyle}>
              <b style={numeroStyle}>{totais.contas}</b>
              <p style={rotuloStyle}>contas</p>
            </div>
            <div style={cardNumeroStyle}>
              <b style={numeroStyle}>{totais.criancas}</b>
              <p style={rotuloStyle}>crianças cadastradas</p>
            </div>
          </div>

          <p style={secaoLabelStyle}>Logins — últimos {DIAS_JANELA} dias</p>
          <div style={cardStyle}>
            {porDia.map((d) => (
              <LinhaBarra key={d.dia} dia={d.dia} valor={d.login} max={maxDia} cor="var(--blue-deep)" />
            ))}
          </div>

          <p style={secaoLabelStyle}>Sincronizações de agenda — últimos {DIAS_JANELA} dias</p>
          <div style={cardStyle}>
            {porDia.map((d) => (
              <LinhaBarra key={d.dia} dia={d.dia} valor={d.sync_calendario} max={maxDia} cor="var(--green-deep)" />
            ))}
          </div>

          <p style={secaoLabelStyle}>Controle de acesso</p>
          <div style={cardStyle}>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
              Desligado: qualquer conta Google entra. Ligado: só os e-mails abaixo.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>
              Trava está: {acesso?.gateAtivo ? 'LIGADA' : 'desligada'}
            </p>
            <label style={{ fontSize: 12, fontWeight: 600 }}>E-mails permitidos (um por linha)</label>
            <textarea
              value={emailsTexto}
              onChange={(e) => { setEmailsTexto(e.target.value); setSalvo(false) }}
              rows={5}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                className="tap-scale"
                onClick={() => salvarAcesso(false)}
                disabled={salvando}
                style={btnSecundarioStyle}
              >
                Desligar trava
              </button>
              <button
                className="tap-scale"
                onClick={() => salvarAcesso(true)}
                disabled={salvando}
                style={btnPrimarioStyle}
              >
                {salvando ? 'Salvando…' : 'Ligar trava com esta lista'}
              </button>
            </div>
            {salvo && <p style={{ fontSize: 12, color: 'var(--green-deep)', fontWeight: 600, marginTop: 8 }}>Salvo ✓</p>}
          </div>
        </>
      )}
    </div>
  )
}

function LinhaBarra({ dia, valor, max, cor }) {
  const [, mes, d] = dia.split('-')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--ink-soft)', width: 36, flexShrink: 0 }}>{d}/{mes}</span>
      <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(valor > 0 ? 6 : 0, (valor / max) * 100)}%`, height: '100%', background: cor, borderRadius: 100 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, width: 18, textAlign: 'right', flexShrink: 0 }}>{valor}</span>
    </div>
  )
}

const cardStyle = { background: 'var(--card)', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-card)' }
const cardNumeroStyle = { ...cardStyle, flex: 1, textAlign: 'center' }
const numeroStyle = { display: 'block', fontFamily: 'var(--font-display)', fontSize: 28 }
const rotuloStyle = { fontSize: 11.5, color: 'var(--ink-soft)', margin: '2px 0 0' }
const secaoLabelStyle = {
  fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
  color: 'var(--ink-soft)', margin: '24px 0 10px',
}
const btnVoltarStyle = {
  padding: '8px 14px', borderRadius: 100, border: '1px solid var(--line)',
  background: '#fff', color: 'var(--ink-soft)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
}
const textareaStyle = {
  width: '100%', padding: 10, marginTop: 8, borderRadius: 12, border: '1px solid var(--line)',
  fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
}
const btnPrimarioStyle = {
  flex: 1, padding: 12, borderRadius: 12, border: 'none',
  background: 'var(--ink)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
}
const btnSecundarioStyle = {
  flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--line)',
  background: '#fff', color: 'var(--ink-soft)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
}
