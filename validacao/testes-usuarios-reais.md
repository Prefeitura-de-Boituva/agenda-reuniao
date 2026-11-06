# Validação final com usuários reais — roteiro de teste

Issue: [#29 Validação final com usuários reais](https://github.com/Prefeitura-de-Boituva/agenda-reuniao/issues/29)
Ambiente: **produção** (aplicação publicada pelo fluxo da issue #27, banco Neon compartilhado)

## Endereço da aplicação

```
URL: <a preencher>
```

> Preencher antes de distribuir para o grupo. Até lá este roteiro não pode ser aplicado.

## Como usar este roteiro (leia isto, colaborador)

Você não precisa saber programação. Siga os cenários na ordem, com um caderno ou esta
planilha aberta ao lado, e para cada passo marque **OK** ou **FALHA**.

Regras durante o teste:

1. **O que você criar aqui é real e fica visível para toda a Prefeitura.** O banco é o
   mesmo da produção.
2. Comece todo nome de reunião com o prefixo `TESTE - ` (ex.: `TESTE - Reunião TI`).
   Isso permite identificar e apagar depois.
3. Use a semana e as salas indicadas pelo coordenador do teste, para não atrapalhar as
   reservas verdadeiras.
4. **Não tente "consertar" nada** quando aparecer um erro. Anote exatamente o que a tela
   mostrou e siga em frente.
5. Anote a **data e a hora** em que fez cada cenário — isso é essencial para reproduzir
   erros de horário.

Seu departamento correto (use sempre um destes, é o que a aplicação aceita):

`Chefia de Gabinete`, `Secretaria Municipal Governo e Planejamento Estratégico`,
`Secretaria Municipal de Assuntos Jurídicos`,
`Secretaria Municipal Administração, Gestão e Equipe Públicos`,
`Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças`,
`Secretaria Municipal Turismo, Juventude e Empreendedorismo`,
`Secretaria Municipal Obras Públicas`,
`Secretaria Municipal Planejamento Urbano e Habitação`

---

## Preparação (coordenador, ~5 minutos antes do grupo)

- [ ] URL acima preenchida e testada por você mesmo em um navegador limpo (anexa).
- [ ] Definir a **janela de datas** de teste (recomendado: a semana seguinte à atual) e a
      sala de cada participante, para que não colidam entre si — exceto no cenário C2,
      que precisa colidir de propósito.
- [ ] Confirmar que pelo menos **3 colaboradores** estarão presentes (critério de aceite
      da issue #29).
- [ ] Combinar o canal de coleta (este arquivo preenchido, formulário ou chat do grupo).
- [ ] Deixar uma reserva de teste já criada na sala de um participante, para o cenário C6.

---

## Cenário C1 — Criar um agendamento válido e conferir se ele ficou salvo

**Objetivo:** confirmar que a reserva criada pelo formulário aparece para todo mundo,
mesmo depois de fechar o navegador.

| Passo | O que fazer | O que deve acontecer |
|---|---|---|
| C1.1 | Abrir a URL | Página inicial com o título **Agenda de Reuniões** |
| C1.2 | Clicar em **Ver na Grade de Horários** | Abre a grade semanal, com células verdes `LIVRE` |
| C1.3 | Clicar em **Novo agendamento** | Abre o modal "Novo Agendamento" |
| C1.4 | No modal, escolher primeiro a **Data** (um dia útil da janela combinada) e deixar **Nome** vazio; clicar em **Confirmar** | Aparece **"Nome é obrigatório"** em vermelho e o modal **não** fecha |
| C1.5 | Preencher: Sala `Sala Azul`, Data (o dia útil escolhido), Horário início `09:00`, Horário fim `10:00`, Nome `TESTE - <sua secretaria>`, Departamento (o seu) | Todos os campos aceitam o que foi digitado |
| C1.6 | Clicar em **Confirmar** | Modal fecha e aparece o aviso **"Sua reunião foi agendada!"**; a célula das 09:00 fica vermelha/ocupada com o nome e o departamento |
| C1.7 | **Apertar `F5`** (recarregar a página) | A reserva `TESTE - ...` **continua aparecendo**. Se sumir, o agendamento não foi gravado: registre como **falha crítica** |
| C1.8 | Abrir a mesma tela em outro navegador (ou aba anexa) por um colega | Ele também enxerga a reserva. Se não enxergar, anote como falha |

**Coleta C1** — Achei fácil encontrar onde agendar: (1) muito difícil → (5) muito fácil
**Observação:**

---

## Cenário C2 — Tentar agendar um horário que já está ocupado

**Objetivo:** conferir a mensagem de conflito. É o erro que mais gera reclamação quando
não é claro.

| Passo | O que fazer | O que deve acontecer |
|---|---|---|
| C2.1 | Repetir C1.3 na **mesma sala, mesma data, mesmo horário** da reserva `TESTE - ...` criada no C1 (09:00 → 10:00), mudando só o nome para `TESTE - Conflito` | Modal abre normalmente |
| C2.2 | Clicar em **Confirmar** | Aparece, dentro do modal, a mensagem **"Horário conflita com agendamento existente"**; o modal **permanece aberto** e nada é gravado |
| C2.3 | Fechar o modal com **Cancelar** e recarregar (`F5`) | A reserva `TESTE - Conflito` **não** existe; a original do C1 continua |

**Coleta C2** — A mensagem de conflito ficou clara sobre o que fazer: (1) não entendi → (5) entendi perfeitamente
**Observação:**

---

## Cenário C3 — Duas reuniões seguidas na mesma sala (deve funcionar)

**Objetivo:** confirmar que encadear reuniões é permitido. Muita gente acredita que é
erro — este cenário elimina a dúvida.

| Passo | O que fazer | O que deve acontecer |
|---|---|---|
| C3.1 | Criar `TESTE - Seguida` na mesma sala e data do C1, início `10:00` e fim `11:00` | **Aceita, sem erro.** O término das 10:00 da primeira é o início das 10:00 da segunda: não há sobreposição |
| C3.2 | Recarregar (`F5`) | As duas reservas aparecem lado a lado na grade, uma em seguida da outra |

**Coleta C3** — Antes deste teste, eu achava que agendar em seguida dava erro: (sim / não)
**Observação:**

---

## Cenário C4 — Tentar agendar em data que já passou

**Objetivo:** confirmar que o calendário não aceita datas antigas.

| Passo | O que fazer | O que deve acontecer |
|---|---|---|
| C4.1 | Abrir **Novo agendamento** e clicar no campo **Data** | O calendário **não permite escolher** nenhum dia anterior a hoje (os dias passados ficam apagados/desabilitados) |
| C4.2 | Na grade, clicar numa célula de um dia que já passou | **Nada acontece** — o modal de criação não abre |
| C4.3 | Mesmo assim, se você conseguir digitar uma data passada e confirmar | Mensagem **"Erro 400: Não é possível agendar para uma data passada."** |

**Coleta C4** — Foi impossível, por engano, agendar em uma data passada: (sim / não)
**Observação:**

---

## Cenário C5 — Tentar agendar hoje em horário que já passou

**Objetivo:** confirmar que a agenda não aceita "voltar no tempo" dentro do próprio dia.

Faça este cenário **depois das 10:00** (senão não há horário passado para escolher hoje).

| Passo | O que fazer | O que deve acontecer |
|---|---|---|
| C5.1 | Abrir **Novo agendamento**, Data = **hoje**, Horário início = um horário que já passou (ex.: `08:00`) | Campo aceita a seleção |
| C5.2 | Completar nome `TESTE - Passado`, departamento, fim e clicar em **Confirmar** | Mensagem **"Horário já passou no dia atual."** e nada é gravado |
| C5.3 | Recarregar (`F5`) | A reserva não existe |

**Coleta C5** — A mensagem explicou o motivo da recusa: (1) não → (5) sim, claramente
**Observação:**

---

## Cenário C6 — Cancelar uma reserva

**Objetivo:** confirmar o cancelamento próprio, a proteção contra cancelamento de
terceiros e a regra de reserva já encerrada.

| Passo | O que fazer | O que deve acontecer |
|---|---|---|
| C6.1 | Na grade, clicar na célula da **sua** reserva `TESTE - ...` (ou no ícone de lixeira **Cancelar agendamento**) | Abre "Cancelar Agendamento" mostrando Sala, Data, Horário, Nome e Departamento corretos |
| C6.2 | Digitar no campo de confirmação **outro departamento** (não o seu) e confirmar | Mensagem **"Departamento não autorizado a cancelar este agendamento."**; a reserva **não** some. Esta mensagem é genérica de propósito e não revela o departamento certo |
| C6.3 | Agora digitar o **seu** departamento, exatamente como na criação, e clicar em **Confirmar cancelamento** | Aviso **"Agendamento cancelado com sucesso!"** e a célula volta a ficar verde `LIVRE` |
| C6.4 | Recarregar (`F5`) | A reserva continua cancelada (sumiu do banco) |
| C6.5 | Digitar o departamento **todo em maiúsculas e sem acentos** (ex.: `SECRETARIA MUNICIPAL OBRAS PUBLICAS`) ao cancelar outra reserva sua | **Aceita normalmente** — maiúsculas e acentos não importam |
| C6.6 | Tentar cancelar uma reserva cujo **horário de fim já passou** | Mensagem **"Não é possível cancelar reserva já encerrada."** |
| C6.7 | Tentar cancelar uma reserva que está **acontecendo agora** (entre início e fim) | **Cancela normalmente** — reunião em andamento ainda pode ser cancelada |

**Coleta C6** — O campo "informe o departamento para confirmar" fez sentido para mim: (sim / não)
**Observação:**

---

## Coleta geral (responda ao terminar todos os cenários)

1. Você usaria esta agenda no dia a dia no lugar do controle atual? (sim / não / talvez) — por quê?
2. O que você tentou fazer e não encontrou na tela?
3. Alguma mensagem de erro ficou confusa ou em linguagem técnica? Escreva qual.
4. As salas exibidas (Azul, Verde, Amarela) e os departamentos da lista correspondem à realidade da Prefeitura? Falta algum?
5. O que precisaria existir para você deixar de usar caderno/planilha para reservar sala?

---

## Limites conhecidos desta versão

Estes pontos **não são bugs novos** — são o comportamento atual da aplicação. Se algo
diferente acontecer, aí sim registre.

- **Editar** (ícone de lápis) grava a alteração **apenas no seu navegador**. Não existe
  endpoint de edição, então ao recarregar a página a edição se perde e a reserva original
  volta. Outros colaboradores nunca veem a edição.
- Os números da página inicial — **5 salas**, **8 reuniões hoje**, **12 horários ocupados** —
  são ilustrativos e fixos; não refletem o banco.
- A lista de reuniões logo abaixo da página inicial também é de exemplo (3 itens fixos),
  igual para qualquer sala.
- A grade trabalha com **3 salas** (Azul, Verde, Amarela), das **08:00 às 17:00**, em blocos
  de **30 minutos**, com duração mínima de **30 minutos**.
- Cancelar uma reserva **que outra pessoa cancelou antes de você** faz a célula sumir da
  sua grade **sem nenhuma mensagem de aviso** — a tela apenas remove localmente. Se isso
  acontecer, anote como sugestão de melhoria, não como falha de dados.
- Se o carregamento da lista de reservas de uma sala falhar, a grade aparece **inteira
  livre** em silêncio, sem aviso de erro. Confira com `F5` antes de concluir que um
  horário está vago.

---

## Critérios de aceite da issue #29

| Critério | Status | Evidência |
|---|---|---|
| Pelo menos 3 colaboradores testaram | ☐ | nomes e datas no registro de bugs |
| Feedback coletado e documentado | ☐ | seções "Coleta" preenchidas + coleta geral |
| Bugs críticos corrigidos | ☐ | abrir 1 issue por bug e vincular aqui |
| Documentação final atualizada | ☐ | resultado consolidado neste documento |

Bugs e sugestões são registrados em [validacao/registro-bugs-29.md](registro-bugs-29.md).

> **Não mover estes arquivos para `docs/`.** A pasta `/docs` é ignorada pelo git
> (`.gitignore:46`) e nada escrito nela entra no repositório — foi assim que o roteiro da
> issue #25 se perdeu.
