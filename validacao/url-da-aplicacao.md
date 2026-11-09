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

Quatro mudanças na branch `feat/url-publica-vercel` (a partir do `develop` `b27579e`):

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
4. **Correção do cenário C1 dentro da branch.** `origin/fix/horario-do-slot-e-criacao-local`
   foi mesclada localmente (`bdac0db`, sem conflito): o formulário agora herda o horário
   do slot clicado. A branch está publicável — não é mais preciso esperar o PR dela.

Estado provado na branch mesclada: 213 testes unitários nos três fusos, `tsc --noEmit`
limpo, ESLint sem erro nos arquivos tocados, `npm run build` registrando
`ƒ Proxy (Middleware)`, `DOCKER_BUILD=1` gerando `.next/standalone/server.js` e
**38 testes e2e verdes** contra o `npm run dev` da 3000 (incluindo `slot-horario.cy.ts`).
O portão foi testado ao vivo em `next start`: 307/401/`200 + Set-Cookie` com senha e
307/503/401 sem senha (fail-closed).

> Nada disto foi publicado ainda: o container no ar continua o `8cd4e35`, sem portão e
> sem o fuso explícito. Os bloqueios de alcance (firewall/reserva de DHCP) continuam
> valendo para a opção A; para a opção C falta só a publicação, abaixo do seu login.

---

## Passo 0 — comum a qualquer opção (15 min)

```bash
cd <repo>                                          # worktree que será publicado
git fetch origin --prune
git checkout develop && git pull --ff-only         # ou a branch feat/url-publica-vercel,
                                                   # que já tem o PR #57 e a correção do slot

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
vercel login      # conta e vinculação são suas
vercel link
vercel --prod
```

Variáveis no painel, em **Production e Preview** (preview sem senha vira URL pública):
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

**1. Publicar o código corrigido** (`feat/url-publica-vercel` já traz o PR #57, o fuso,
o portão de senha e a correção do slot; para a opção A pela 3001, o `develop` ainda
precisa do PR da `fix/horario-do-slot-e-criacao-local`):

```bash
git checkout develop && git pull --ff-only && git rev-parse --short HEAD
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

