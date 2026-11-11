# Como dar uma URL à aplicação — issue [#29](https://github.com/Prefeitura-de-Boituva/agenda-reuniao/issues/29)

Passo a passo para a subtask **Disponibilizar URL da aplicação para o grupo**.
Companion de [relatório de execução](relatorio-execucao-29.md) (Fase 0) e do
[roteiro de teste](testes-usuarios-reais.md).

## Estado verificado hoje (2026-11-09)

Estas linhas são fato observado, não presunção:

| Item | Estado |
|---|---|
| Container de produção (`docker-compose.prod.yml`) | **no ar**, `agenda-reuniao-neon-app-1`, `0.0.0.0:3001 -> 3000` |
| Banco apontado pelo container | Neon `ep-snowy-sea-b759h3c2-pooler.c-13.us-east-1` (pooled) |
| `GET /api/health` | 200, `status: ok` |
| `GET /api/health?db=1` | `database: ok` |
| `GET /api/agendamentos?sala=Sala Azul&data=<dia>` | 200, lista vazia |
| Acesso por IP da máquina na rede | `http://192.168.66.102:3001` responde 200 **a partir desta máquina** |
| `.env.production.local` | **não existe** em nenhum worktree — a `DATABASE_URL` do container atual foi injetada na mão no `up` |
| Imagem publicada | tag `8cd4e35`, ~4 dias atrás |
| `cloudflared` / `ngrok` | **não instalados** |

Dois bloqueios reais antes de convidar alguém:

1. **A imagem publicada é anterior às correções.** O container roda `8cd4e35`, que é
   ancestral do `develop` e **não contém** o PR #57 nem a correção do horário do slot
   livre (`9e6998a`, ainda em `origin/fix/horario-do-slot-e-criacao-local`, sem PR).
   Publicado assim, o cenário C1 vai reproduzir exatamente o bug que já motivou a
   correção.
2. **Nada garante que outro computador alcança a 3001.** O bind é `0.0.0.0` e o tráfego
   sai pelo `com.docker.backend.exe`, mas o firewall do Windows tem regras de entrada
   *Allow* e *Block* simultâneas. Isso só se prova de outra máquina.

## O que mudou no repositório depois deste levantamento

Quatro mudanças, nascidas na branch `feat/url-publica-vercel` (a partir do `develop`
`b27579e`) e agora mescladas em `main` (`c56df25`), que já continha os PRs #58 e #59:

1. **Fuso explícito.** `src/lib/fuso.ts` fixa `America/Sao_Paulo` nas regras RN12/RN16
   e na grade. Antes elas dependiam do fuso do processo: num host em UTC (caso da
   Vercel) a validação de "horário passado" era pulada entre 21h e 24h de Boituva.
   Provado com a suíte inteira em `TZ=UTC`, `TZ=America/Sao_Paulo` e `TZ=Asia/Tokyo`
   (213 testes nos três).
2. **Portão de senha.** A aplicação inteira agora exige uma senha compartilhada
   (`ACCESS_PASSWORD`), com tela em `/entrar`. Em produção **sem** essa variável o
   acesso fica **fechado** — não aberto. Isso muda os `curl` deste guia: `/api/*`
   responde 401 sem cookie e as páginas redirecionam para `/entrar`.
   `/api/health` continua público, de propósito, por causa do healthcheck.
3. **Preparo para a Vercel.** `vercel.json`, `.nvmrc`/`engines.node` em 24,
   `output: "standalone"` ligado só no build da imagem Docker (`DOCKER_BUILD=1`) e
   `.vercelignore` para a CLI não subir `.env`, `.git` nem as suítes de teste.
   O passo a passo de publicação está no README, seção **Deploy na Vercel**.
4. **Correção do cenário C1.** `origin/fix/horario-do-slot-e-criacao-local`
   foi mesclada localmente (`bdac0db`, sem conflito): o formulário agora herda o horário
   do slot clicado. Está em `main` — não é mais preciso esperar o PR dela.

Estado provado em `main` (`c56df25`, merge de `ca3131a` + `1761b02`): 212 testes
unitários nos três fusos, `tsc --noEmit` limpo, ESLint sem erro nos arquivos tocados
(2 avisos pré-existentes do upstream em `ScheduleGrid.tsx`), `npm run build`
registrando `ƒ Proxy (Middleware)` e **sem** `.next/standalone`, `DOCKER_BUILD=1`
gerando `.next/standalone/server.js`, e **38 testes e2e verdes** contra o
`npm run dev` na 3030 — incluindo `slot-horario.cy.ts` e `cancelamento.cy.ts`, que
usa o Postgres local. O portão foi testado ao vivo em `next start` na 3031:
307 → `/entrar?prox=%2F`, `prox` preservando `?date=…&room=…`, API 401 sem cookie,
`/api/health?db=1` com `database: ok`, senha errada 401, senha certa 200 + cookie
`agenda-acesso`, e 200 autenticado.

Um teste a menos que os 213 anteriores: o upstream removeu `getNextWeekday` e
`getPreviousWeekday` como código morto, e o único consumidor era o teste de fuso que
as exercitava. No merge a remoção prevaleceu.

> Nada disto está publicado ainda. O container no ar continua o `8cd4e35`, sem portão
> e sem fuso explícito, e a URL pública não existe. Os bloqueios de alcance
> (firewall/reserva de DHCP) continuam valendo para a opção A; para a opção C falta
> só a publicação, abaixo do seu login.

## O deploy da Vercel que falhou (2026-11-11)

`dpl_BibRZjVCcYR63hjcYs6iCvBPL1FQ` falhou. O que se sabe, com evidência:

- **Não saiu desta máquina.** A CLI não tem credenciais aqui (`npx vercel inspect`
  responde `No existing credentials found`), não há `.vercel/` em nenhum dos três
  checkouts, e o GitHub não registra deployment nem comentário de bot no commit. O
  upstream ganhou `neon.ts` (`@neon/config/v1`, commit `495628d`), o que aponta para
  a integração Neon↔Vercel como origem do projeto.
- **O código construído não era o preparado.** `origin/main` (`ca3131a`, PR #59) e
  `origin/develop` (`f081985`, PR #58) não continham `vercel.json`, `.nvmrc`,
  `.vercelignore`, `src/proxy.ts` nem `src/lib/fuso.ts`. Mesmo verde, aquele build
  publicaria a agenda sem senha e com RN12/RN16 dependentes do fuso do processo.
- **Não é falha de install.** `npm ci --dry-run --ignore-scripts` sobre `origin/main`
  resolveu 917 pacotes com o lockfile em sincronia.
- **Falta de `DATABASE_URL` não derruba o build** — mas o `src/prisma/db.ts` do
  upstream cai num mock em memória nesse caso: um deploy "verde" sem env serviria
  agenda vazia, perdendo tudo a cada cold start. As variáveis são obrigatórias antes
  do primeiro tráfego.

O log continua pendente: sem login na CLI não há como ler
`npx vercel inspect dpl_BibRZjVCcYR63hjcYs6iCvBPL1FQ --logs`. A correção estrutural
já está feita — `main` local agora carrega o preparo (`c56df25`), então a próxima
publicação deve sair deste diretório, com `vercel --prod`, e não do remoto
despreparado.

### Segunda falha, já com o preparo no remoto (2026-11-11)

`main` foi enviado (`ca3131a..ce785e5`, fast-forward, sem force) e a integração
GitHub↔Vercel disparou sozinha um deploy novo — o que confirma que o projeto
`prefeitura-boituva/agenda-reuniao` está ligado ao GitHub, e não à CLI local.
**Ele também falhou**: `dpl_CKWKTga2L6mYqkpG6TEJm66U7CUm`. Logo a causa não era a
falta do preparo.

Descartado com prova local, na árvore `ce785e5`:

| Hipótese | Resultado |
|---|---|
| Lockfile fora de sincronia | `npm ci --dry-run --ignore-scripts`: 917 pacotes, ok |
| Falta de env no build | build com `.env` afastado: rc=0, `ƒ Proxy (Middleware)` |
| `db.ts` estourando sem `DATABASE_URL` | cai no mock em memória, não lança |
| Tipos / lint | `tsc --noEmit` limpo; ESLint 0 erros nos arquivos tocados |
| Node | `.nvmrc`/`engines` em 24; local v24.22.1 builda |

Sobram causas específicas da plataforma (versão do adapter para o Next 16.3.4,
etapa de install/build da Vercel, limite de memória ou configuração do projeto).
**O log é o único caminho**: `npx vercel login` e depois
`npx vercel inspect dpl_CKWKTga2L6mYqkpG6TEJm66U7CUm --logs`, ou as últimas linhas
do painel em `vercel.com/prefeitura-boituva/agenda-reuniao/CKWKTga2L6mYqkpG6TEJm66U7CUm`.

---

## Passo 0 — comum a qualquer opção (15 min)

```bash
cd <repo>                                          # worktree que será publicado
git fetch origin --prune
git checkout main                                  # main local c56df25: PR #57, fuso, portão
                                                   # e correção do slot. Sem pull --ff-only:
                                                   # este merge ainda não foi enviado.

# 1. arquivo de env do deploy (NUNCA versionar: .gitignore já cobre ".env*")
cp .env.production.example .env.production.local
chmod 600 .env.production.local
#   editar: DATABASE_URL pooled (-pooler), DIRECT_URL sem -pooler e ACCESS_PASSWORD
#   (a senha do grupo; sem ela o compose falha de propósito)

# 2. migrations no banco de destino — o container NÃO roda migration
export $(grep -E '^DIRECT_URL=' .env.production.local | xargs)
npx prisma db migrate --db "$DIRECT_URL"
npx prisma db verify  --db "$DIRECT_URL" --strict   # "Database marker and schema match contract"
```

> Não rodar `npm run seed` contra o Neon: os dados são reais e o seed é bloqueado em
> produção (commit `4a788a2`).

---

## Passo 1 — escolher a opção

| | A. Rede interna | B. Túnel temporário | C. Vercel |
|---|---|---|---|
| URL | `http://<IP>:3001` | `https://<aleatorio>.trycloudflare.com` | `https://<projeto>.vercel.app` |
| Custo | zero | zero (quick tunnel) | conta + plano (Hobby não serve para produção) |
| HTTPS | não | sim | sim |
| Funciona fora da rede da Prefeitura | não | sim | sim |
| Esforço | ~5 min | ~15 min (+ aprovação) | ~30 min (+ conta/plano) |
| Serve para a sessão de validação | **sim, é a mais rápida** | sim | sim, depois da conta e do plano |

**Recomendação:** opção **A** para as sessões da #29 (o repo já está pronto para a
**C**, que é o alvo definitivo — ver o README). A **B** só se a validação precisar
acontecer fora do prédio **e** o TI aprovar o túnel.

---

## Opção A — URL na rede interna (a que já está 90% pronta)

```bash
# subir no commit certo, com tag rollbackável
export TAG=$(git rev-parse --short HEAD)
docker compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```

```bash
# IP da interface física (a "Topaz Loopback" 54.232.189.113 e a WSL 172.21.176.1 NÃO servem)
ipconfig | grep -A2 Ethernet
```

Provar na máquina, de fora do container:

```bash
curl -s http://localhost:3001/api/health
curl -s "http://localhost:3001/api/health?db=1"     # database: ok

# com o portão de senha, a leitura de agendamentos exige cookie:
curl -s -c /tmp/cookies.txt -X POST http://localhost:3001/api/acesso \
  -H 'content-type: application/json' -d '{"senha":"<ACCESS_PASSWORD>"}'
curl -s -b /tmp/cookies.txt "http://localhost:3001/api/agendamentos?sala=Sala%20Azul&data=<AAAA-MM-DD>"
```

Sem o cookie, `/api/agendamentos` responde **401** e `/grade` redireciona para
`/entrar` — é o comportamento esperado, não um defeito.

Provar **de outro computador do mesmo Wi-Fi/redeswitch**: abrir
`http://<IP>:3001/grade` no navegador. Se não carregar, é o firewall — liberar a porta
no perfil *Private* (PowerShell como administrador):

```powershell
New-NetFirewallRule -DisplayName "agenda-reuniao 3001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001 -Profile Private
```

Avisar o grupo sobre as limitações: a URL só vale dentro da rede da Prefeitura, é
**HTTP sem TLS**, e o IP pode mudar se a máquina não tiver endereço reservado no DHCP —
pedir a reserva ao TI deixa a URL estável e é o único pré-requisito externo da opção A.

## Opção B — túnel temporário (para validar fora do prédio)

Nem `cloudflared` nem `ngrok` estão instalados; é preciso instalar primeiro.

```bash
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3001     # imprime https://<aleatorio>.trycloudflare.com
```

O quick tunnel **troca de URL a cada execução** — distribuir a URL só depois de o túnel
estar de pé, e avisar que ela vale até o processo morrer. Duas ressalvas antes de usar:
os dados de servidores municipais passam por um terceiro, e o Neon pode suspender no meio
da sessão (o `?db=1` na URL acordaria o banco). Levar a decisão ao responsável pela
LGPD/segurança da informação, não decidir sozinho.

## Opção C — Vercel (o alvo definitivo; repositório já preparado)

O banco já é remoto (Neon), então publicar é apontar a mesma `DATABASE_URL` pooled
para as functions da Vercel. O passo a passo completo está no README, seção
**Deploy na Vercel**; o que importa para a #29:

```bash
npm i -g vercel
vercel login                              # conta e vinculação são suas
vercel link
vercel env add DATABASE_URL production    # string POOLED do Neon (host -pooler)
vercel env add DATABASE_URL preview
vercel env add ACCESS_PASSWORD production
vercel env add ACCESS_PASSWORD preview
vercel --prod                             # publica ESTE diretório e devolve a URL
```

`vercel --prod` pela CLI sobe os arquivos locais, não o GitHub: não depende de push
nem do branch remoto. É o caminho certo agora que `main` local (`c56df25`) carrega o
preparo — importar o repositório pelo painel construiria o remoto, que ainda não tem
portão nem fuso explícito enquanto este merge não for enviado.

Variáveis em **Production e Preview** (preview sem senha vira URL pública da agenda):
`DATABASE_URL` (pooled) e `ACCESS_PASSWORD`. `DIRECT_URL` não vai para a Vercel — as
migrations continuam sendo aplicadas da sua máquina, como no Passo 0.

Três ressalvas honestas antes de prometer esta URL ao grupo:

- **Hobby não é permitido para uso de produção** nos termos da Vercel. Para a
  Prefeitura usar de forma contínua é preciso Pro; Hobby serve só para uma
  validação curta e interna.
- O endereço `agenda-reuniao.vercel.app` **não existe hoje** e o nome pode estar
  ocupado — a Vercel sugere `agenda-reuniao-<escopo>.vercel.app`. Um domínio
  institucional exige os registros DNS do TI; `*.vercel.app` não é endereço da
  Prefeitura.
- As functions estão em `iad1` (o `vercel.json` já fixa), perto do Neon em
  `us-east-1`. Não mover para `gru1` sem medir: cada consulta pagaria uma ida e
  volta ao banco.

O fuso deixou de ser um item de checklist: está explícito no código
(`src/lib/fuso.ts`), então rodar em UTC na Vercel não quebra RN12/RN16.

---

## Passo 2 — gate antes de convidar qualquer pessoa

```bash
# 1. o código publicado é o corrigido?
docker inspect agenda-reuniao-neon-app-1 --format '{{.Config.Image}}'   # tag = HEAD atual, não 8cd4e35

# 2. banco de pé e contrato aplicado
curl -s "http://localhost:3001/api/health?db=1"                          # database: ok

# 3. portão de senha: fechado sem cookie, aberto com ele
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/agendamentos   # 401
curl -s -c /tmp/cookies.txt -X POST http://localhost:3001/api/acesso \
  -H 'content-type: application/json' -d '{"senha":"<ACCESS_PASSWORD>"}'          # {"ok":true}
curl -s -b /tmp/cookies.txt -o /dev/null -w '%{http_code}\n' http://localhost:3001/  # 200

# 4. ciclo completo de escrita, com limpeza
#    criar um "TESTE - <data>" pela UI na URL real, ler na grade, cancelar e conferir que sumiu
```

A senha vai **junto com a URL** para o grupo, por um canal que não seja a própria
agenda. Uma senha só, sem identidade por usuário: quem tem a senha cria e cancela
reservas em nome de qualquer departamento. Isso é aceito para a validação da #29,
não é controle de acesso por pessoa.

Depois: rodar **sozinho** os cenários C1 a C6 na URL real (ensaio do coordenador),
limpar as reservas `TESTE - ` e só então preencher o bloco **Endereço da aplicação** em
[testes-usuarios-reais.md](testes-usuarios-reais.md), que hoje está `<a preencher>`.

**Nada disto deve ser feito com o `npm run dev` da porta 3000** — a 3000 usa Postgres
local e serve para desenvolvimento; os colaboradores testam o container de produção.

---

## Anexo — lista pronta para colar (opção A, item por item independente)

Cada bloco abaixo é autossuficiente; rode na ordem e pare no primeiro que falhar.

**1. Publicar o código corrigido** (`main` local `c56df25` já traz o PR #57, o fuso, o
portão de senha, a correção do slot e os PRs #58/#59. O remoto **não** tem o preparo:
não importe o repositório pelo painel da Vercel antes de enviar este merge):

```bash
git checkout main && git rev-parse --short HEAD    # esperado: c56df25
```

**2. Criar o env do deploy** (uma vez por máquina; o arquivo não está no git):

```bash
cp .env.production.example .env.production.local && notepad .env.production.local
```

Preencher `DATABASE_URL` (host com `-pooler`), `DIRECT_URL` (sem `-pooler`) e
`ACCESS_PASSWORD` (senha do grupo) com os valores reais. `APP_PORT=3001`, `TAG` pode
ficar `latest` (o item 4 sobrescreve). Sem `ACCESS_PASSWORD` o `docker compose up`
falha com mensagem explícita — é proposital, para não publicar uma agenda fechada.

**3. Conferir o banco de destino** (leitura pura — hoje já está `ca204f28…`, *match*):

```bash
set -a; . ./.env.production.local; set +a; npx prisma db verify --db "$DIRECT_URL"
```

Só se aparecer divergência de contrato é que se roda `npx prisma db migrate --db "$DIRECT_URL"`.

**4. Subir a imagem no commit atual**, com tag para rollback:

```bash
TAG=$(git rev-parse --short HEAD) docker compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```

**5. Provar que a aplicação e o banco respondem juntas:**

```bash
curl -s http://localhost:3001/api/health && curl -s "http://localhost:3001/api/health?db=1"
```

Esperado: `"status":"ok"` e `"database":"ok"`. Se `database` der `error` com `EAI_AGAIN`
logo após a máquina acordar, reiniciar o container (`docker restart agenda-reuniao-neon-app-1`)
— o healthcheck de liveness não consulta o banco e esconde essa falha.

O health não exige senha; o resto da aplicação sim. Conferir o portão com os três
`curl` do **Passo 2** antes de distribuir a URL.

**6. Descobrir a URL que os outros veem:**

```bash
powershell.exe -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Ethernet).IPAddress"
```

A URL da validação é `http://<esse IP>:3001`. Ignorar `54.232.189.113` (Topaz Loopback) e
`172.21.176.1` (WSL): nenhuma das duas sai da máquina.

**7. Testar de outro computador** (mesma rede, navegador em `http://<IP>:3001/grade`).
Se não abrir, liberar a porta no firewall — PowerShell como administrador:

```powershell
New-NetFirewallRule -DisplayName "agenda-reuniao 3001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001 -Profile Private
```

**8. Registrar a URL nos documentos da #29:**

```bash
notepad validacao/testes-usuarios-reais.md
```

Substituir `<a preencher>` no bloco **Endereço da aplicação**.

**9. Ensaio do coordenador, sozinho, antes de convidar o grupo:** entrar em `/entrar`
com a senha do grupo, rodar C1 a C6 na URL real e limpar as reservas `TESTE - ` que o
ensaio criar. Só então enviar URL **e senha** aos colaboradores.

