# Primeira Infância — Calendário Vacinal

PWA que gera automaticamente o calendário de vacinação de um bebê/criança a
partir da data de nascimento, com integração ao Google Calendar.

## Fase 2 — Checklist de infraestrutura (fazer manualmente, uma vez)

### 1. Firebase
1. Acesse console.firebase.google.com → **Criar projeto**
2. Ative **Authentication** → métodos "E-mail/senha" e "Google"
3. Ative **Firestore Database** (modo produção)
4. Em Configurações do projeto → Seus apps → **Web**, copie as chaves para o `.env` (ver `.env.example`)
5. Publique as regras: `firebase deploy --only firestore:rules` (ou cole o conteúdo de `firestore.rules` no console)

### 2. Google Cloud / Google Calendar API
1. No mesmo projeto (Firebase usa um projeto GCP por baixo), acesse console.cloud.google.com
2. **APIs e Serviços → Biblioteca** → ative "Google Calendar API"
3. **APIs e Serviços → Tela de consentimento OAuth**: preencha nome do app, e-mail; escopo `calendar.events`
4. **Credenciais → Criar credenciais → ID do cliente OAuth** → tipo "Aplicativo da Web"
   - Origens autorizadas: `http://localhost:5173` e a URL da Netlify depois do deploy
   - Copie Client ID/Secret para `.env` (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, usados só pela function)

### 3. Netlify
1. Suba este repositório no GitHub
2. Na Netlify: **Add new site → Import from Git**
3. Build command: `npm run build` · Publish directory: `dist` (já configurado em `netlify.toml`)
4. Em **Site settings → Environment variables**, cole todas as variáveis do `.env`

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencha com suas chaves
npm run dev
```

## Estrutura

```
src/
  data/pni-calendario-vacinal.json   # base de vacinas (fonte: Ministério da Saúde)
  utils/calcularCalendario.js        # nascimento → datas de cada dose, agrupadas por dia
  pages/                             # Login, Cadastro, Home, Calendário, Perfil
  components/BottomNav.jsx
netlify/functions/
  criar-eventos-calendario.js        # cria eventos no Google Calendar (roda no servidor)
```

## Pendências antes de produção (ver conversa de planejamento)
- [ ] Revisão clínica (pediatra/farmacêutico) dos campos `reacoes_comuns`,
      `contraindicacoes` e `esquema_particular` em `pni-calendario-vacinal.json`
      — vários ainda estão como `pendente_revisao_clinica`
- [ ] As DATAS de cada dose hoje são sempre calculadas pelo esquema SUS,
      mesmo se o usuário escolher "Particular" na tela de decisão — a base
      de dados só tem idade-alvo estruturada para o SUS. Escolher
      "Particular" hoje é só uma preferência salva, sem efeito na data.
- [ ] Política de privacidade (LGPD — dado de saúde de criança é dado sensível)
- [ ] Chamar a Netlify Function `criar-eventos-calendario.js` de fato a
      partir do front-end (hoje ela existe mas ninguém a chama ainda)

## Rodando localmente

```bash
npm install
cp .env.example .env   # cole as chaves do Firebase e do Google Cloud
npm run dev
```
Abre em `http://localhost:5173`.

## Deploy (GitHub + Netlify)

```bash
git init
git add .
git commit -m "primeira versão do app"
```
1. Crie um repositório vazio no GitHub (github.com/new) — não marque "adicionar README"
2. `git remote add origin <URL do seu repositório>`
3. `git branch -M main && git push -u origin main`
4. Na Netlify: **Add new site → Import an existing project → GitHub** → selecione o repositório
5. Build command e publish directory já vêm do `netlify.toml` — não precisa mexer
6. Antes de clicar em "Deploy": **Site settings → Environment variables** → cole todas as chaves do seu `.env` (Firebase + `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`)
7. Deploy site
8. Depois do primeiro deploy, copie a URL gerada (ex: `nome-aleatorio.netlify.app`) e volte no Google Cloud → Credenciais → seu Client OAuth → adicione essa URL em "Origens JavaScript autorizadas"
