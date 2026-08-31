# Handoff — App de Calendário Vacinal Infantil

## Contexto do produto

App (PWA) que gera automaticamente o calendário de vacinação de um bebê/criança
a partir da data de nascimento, com integração ao Google Calendar (calendário
compartilhado entre os responsáveis). Público: famílias no Brasil, baseado no
calendário oficial do PNI/Ministério da Saúde.

**Decisões já tomadas** (não reabrir sem necessidade real):
- Stack: React + Vite, PWA
- Backend: Firebase (Authentication + Firestore)
- Hospedagem: Netlify, com Netlify Functions para lidar com OAuth/Google Calendar API (o client secret não pode ir pro front-end)
- Autenticação: e-mail/senha + login com Google (o escopo do Google Calendar já é pedido no próprio login com Google)
- Um usuário administra a conta; o segundo responsável só recebe convite por e-mail nos eventos do Google Calendar (não tem login próprio)
- Uma criança por conta, por enquanto
- Calendário até 9–14 anos (inclui HPV, reforços pré-adolescência)
- Interface mostra SUS e Particular lado a lado
- Design: paleta pastel (bege, azul, verde), inspiração Apple + Nubank, tipografia Quicksand (títulos) + Inter (corpo)
- "Meu calendário" agrupa vacinas por **dia de visita** (não por vacina) — o objetivo é o pai/mãe saber "hoje são 3 picadas" antes de ir ao posto
- Cada vacina tem uma folha de detalhe: para que serve, reações comuns, quando procurar médico, contraindicações

## Estado atual do código

Repositório local em: `/Users/nicollascozzolino/Documents/GitHub/vacinas-app`
(sendo publicado no GitHub via GitHub Desktop nesta sessão — confirmar se o push já foi concluído)

```
src/
  data/pni-calendario-vacinal.json   # base de vacinas — ver observação abaixo
  utils/calcularCalendario.js        # nascimento → datas de cada dose, agrupadas por dia
  firebase.js                        # config Firebase via variáveis de ambiente
  App.jsx                            # roteamento entre telas, usa onSnapshot (tempo real)
  pages/
    Login.jsx                        # email/senha + Google
    CadastroCrianca.jsx              # nome + nascimento → salva no Firestore
    Home.jsx
    Calendario.jsx                   # abas "Calendário sugerido" / "Meu calendário"
    Perfil.jsx
  components/
    BottomNav.jsx
    DecisionCard.jsx                 # decisão SUS × Particular (ver pendência abaixo)
netlify/functions/
  criar-eventos-calendario.js        # cria eventos no Google Calendar — existe mas NINGUÉM a chama ainda no front-end
firestore.rules                      # cada uid só acessa seu próprio documento em /criancas/{uid}
```

Também existe um mockup HTML estático (não é o código de produção, foi só pra
validar o design com o usuário) — se encontrar `mockup-vacinas*.html` por aí,
é só referência visual, não precisa manter sincronizado com o código React.

## Base de dados de vacinas — status importante

`src/data/pni-calendario-vacinal.json` foi montada com:
- **Esquema SUS**: extraído da fonte oficial (gov.br/saude/vacinacao/calendario) — confiável, completo, com idade-alvo em meses por dose
- **`esquema_particular`**: só tem uma nota textual (`nota_preliminar`), SEM idade-alvo estruturada por dose. Ou seja, **as datas do calendário hoje são sempre calculadas pelo esquema SUS**, mesmo que o usuário escolha "Particular" no `DecisionCard`
- **`reacoes_comuns` / `quando_procurar_medico` / `contraindicacoes`**: preenchidos com fonte citada (Ministério da Saúde — Manual de Eventos Adversos Pós-Vacinação; SBP) só para BCG, Penta/DTP, Rotavírus, Pneumocócica e Febre amarela. As demais vacinas têm o campo `"pendente_revisao_clinica"` — **não inventar conteúdo aqui**, é dado de saúde
- Antes de produção de verdade, um pediatra ou farmacêutico precisa revisar esses campos

## Pendências / próximos passos, em ordem sugerida

1. **Confirmar que o push pro GitHub funcionou** e que o `.env` (com chaves reais) NÃO foi commitado — checar se `.gitignore` está sendo respeitado
2. **Rodar localmente**: `npm install`, copiar `.env.example` para `.env` e preencher com as chaves do Firebase/Google Cloud que o usuário já gerou, `npm run dev`, testar o fluxo login → cadastro → calendário aparecendo com datas corretas
3. **Ligar a Netlify Function ao front-end**: hoje `criar-eventos-calendario.js` existe mas nada no `Calendario.jsx`/`Home.jsx` a chama. Precisa: pegar o `accessToken` do Google (retornado no login via `GoogleAuthProvider`/`signInWithPopup`, campo `credential.accessToken`), montar o payload com os `dias` agrupados de `agruparPorDiaDeVisita`, e um botão tipo "Sincronizar com Google Agenda" que faz o POST pra function
4. **Resolver a limitação do esquema Particular**: completar `esquema_particular` no JSON com idade-alvo por dose (igual o SUS tem), pra que escolher "Particular" no `DecisionCard` realmente recalcule as datas — hoje é só uma preferência salva, sem efeito
5. **Testar multiusuário**: criar uma segunda conta de teste, confirmar que os dados ficam isolados por `uid` (as `firestore.rules` já cobrem isso, mas vale testar na prática)
6. **Deploy na Netlify**: conectar o repositório GitHub, configurar as variáveis de ambiente no painel da Netlify, liberar a URL gerada nas "Origens JavaScript autorizadas" do Google Cloud
7. **Antes de divulgar pra outras famílias**: revisão clínica pendente (item da base de dados acima) + política de privacidade simples (dado de saúde de criança é dado sensível pela LGPD)

## O que NÃO mudar sem avisar o usuário

- A paleta de cores e tipografia — já validadas com o usuário através de várias iterações de mockup
- A estrutura "agrupar por dia de visita" no calendário — é um requisito explícito do usuário (evitar que pais sejam surpreendidos com mais picadas do que esperavam)
- Não preencher campos de saúde (`reacoes_comuns`, `contraindicacoes`) com conteúdo não verificado — deixar `pendente_revisao_clinica` é intencional
