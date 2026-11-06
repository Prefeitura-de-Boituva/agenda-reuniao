# Relatório de execução — o que acontece quando a URL ficar pronta

Issue: [#29](https://github.com/Prefeitura-de-Boituva/agenda-reuniao/issues/29)
Documentos ligados: [roteiro](testes-usuarios-reais.md) · [registro](registro-bugs-29.md)
Status atual: roteiro pronto e validado contra o código; **URL ainda não existe**.

---

## Fase 0 — Dar uma URL ao que hoje só roda local

Nada disto está feito. Enquanto a Fase 0 não fechar, as fases 1 a 4 não começam.

1. Escolher o alvo: rede interna da Prefeitura (`http://<IP>:3001`, sem HTTPS) ou o
   Caddy + domínio oficial que a dependência #27 previa.
2. Subir o compose de produção com `.env.production.local` (existe só no worktree da área
   de trabalho, não neste).
3. Provar que está de pé antes de convidar alguém:

   ```bash
   curl -s <URL>/api/health            # liveness
   curl -s "<URL>/api/health?db=1"     # acorda o Neon e confirma leitura/escrita
   ```

4. Colar a URL em `testes-usuarios-reais.md`, no bloco **Endereço da aplicação**.
5. **Ensaio do coordenador**: executar sozinho os cenários C1 a C6 na URL real. Se alguma
   mensagem esperada não aparecer exatamente como no roteiro, corrigir o roteiro — não o
   código — antes da sessão.
6. Limpar as reservas `TESTE - ` criadas no ensaio.

**Portão de saída:** o coordenador rodou os 6 cenários e todos bateram.

> O `?db=1` existe para isso: o healthcheck padrão do container **não** consulta o banco
> de propósito, para não impedir a suspensão automática do Neon. Um banco adormido deixa a
> primeira reserva da sessão lenta — acordar antes com `?db=1` evita o susto.

---

## Fase 1 — Sessão com os colaboradores (~40 min, tarde)

- Mínimo 3 participantes (critério de aceite). Agendar **depois das 10h**: C5 exige que já
  tenham horários passados no dia.
- Cada participante com uma cópia do roteiro; coordenador preenche a tabela de participantes
  do registro no ato.
- Sortear sala e janela de datas para que só o C2 colida de propósito.
- Criar previamente uma reserva na sala de um participante (necessário para C6.2 e C6.6).
- Durante a sessão o coordenador **não explica e não corrige nada**: anota, deixa o
  colaborador travar, marca o horário. É esse atrito que estamos procurando.
- Se o banco cair no meio da sessão, anotar como bloqueio e retomar em outra data — não
  "consertar na frente do usuário".

**Saída:** tabelas de coleta dos 6 cenários preenchidas + coleta geral respondida.

---

## Fase 2 — Triagem (até 24h depois)

1. Transcrever tudo para `registro-bugs-29.md` e dar severidade.
2. Dedupear contra os limites já documentados, que **não** viram issue nova:
   edição só local, números fixos da home, célula de dia passado verde e clicável,
   grade que aparece toda livre quando o `GET` falha.
3. Um issue por bug crítico/alto:

   ```bash
   gh issue create --repo Prefeitura-de-Boituva/agenda-reuniao \
     --title "<resumo do comportamento errado>" --body-file B01.md --label bug
   ```

4. Marcar `[x] Registrar issues encontradas` na #29 e preencher a coluna "Issue aberta".

---

## Fase 3 — Correção dos críticos

Escopo **não aprovado ainda** — depende das issues que a Fase 2 abrir.

- Uma branch por issue, como o resto do projeto faz.
- Teste antes da correção (`npm run test:run`); para bug visível na tela, um spec novo em
  `cypress/e2e/`.
- Re-aplicar na URL real o cenário que falhou, com o mesmo colaborador, antes de fechar.

---

## Fase 4 — Fechar a #29

- Consolidar a Fase 2 no roteiro (seção de critérios de aceite) e escrever as lições
  aprendidas.
- Comentar na issue com a evidência (quem testou, quando, quantos bugs, o que foi corrigido)
  e fechar.

---

## Comandos de suporte, para qualquer fase

```bash
# estado desta branch antes de publicar
git status --short && git log --oneline origin/develop..HEAD

# suíte completa + um cenário de UI (precisa de `npm run dev` rodando)
npm run test:run
npx cypress run --spec cypress/e2e/cancelamento.cy.ts

# quanto de reserva de teste ficou suja no banco (sala e dia)
curl -s "<URL>/api/agendamentos?sala=Sala%20Azul&data=<AAAA-MM-DD>"
```

> Não rodar `npm run seed` contra a URL de produção: o seed é bloqueado em produção
> (commit `4a788a2`) e os dados são reais.
