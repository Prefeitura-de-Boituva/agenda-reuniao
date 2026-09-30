# RN12 – Bloqueio de agendamento em horário passado (mesmo dia)

**Regra de negócio**
- Não é permitido agendar um horário que já tenha decorrido no dia corrente. Se a data do agendamento for hoje, o horário de início deve ser maior ou igual ao horário atual.

**Motivação**
- Garante que a grade reflita apenas possibilidades futuras, evitando confusão e entradas inconsistentes.

**Implementação**
- **Back‑end** (`src/app/api/agendamentos/route.ts`): a verificação `isPast` devolve 400 com a mensagem *"Horário já passou no dia atual."* antes de salvar.
- **Front‑end** (`src/components/schedule/ScheduleGrid.tsx` → `BookingFormModal`): a mesma verificação impede o submit e exibe a mensagem ao usuário.

**Resposta da API**
- `400 Bad Request` com o corpo `{ "error": "Horário já passou no dia atual." }`. A API não expõe um código de erro estruturado; o front‑end bloqueia antes do submit usando `isPastToday` (`src/lib/validations.ts`).

---

# RN13 – Reservas Consecutivas

**Regra de negócio**

- **Permitir reservas consecutivas**. Dois agendamentos na mesma sala e na mesma data podem ter horário de fim exatamente igual ao horário de início do próximo agendamento (ex.: 10:00‑11:00 e 11:00‑12:00). Não há conflito, pois não há sobreposição de tempo.

**Motivação**

- Facilita o uso máximo das salas, permitindo que o próximo usuário comece pontualmente quando o anterior termina.
- Mantém a lógica de validação atual (`temConflito`) que verifica sobreposição usando a condição `inicio < ag.horaFim && fim > ag.horaInicio`. Essa condição já devolve *false* quando `inicio === ag.horaFim` ou `fim === ag.horaInicio`.

**Impacto no código**

- Nenhuma mudança de código é necessária, pois a implementação existente já segue a regra.
- Os testes em `src/lib/__tests__/conflict.test.ts` cobrem o caso de reservas consecutivas e esperam **false** (sem conflito).

**Documentação**

- Esta regra está registrada como **RN13** e deve ser consultada ao discutir validações de horário.

---

# RN14 – Preenchimento e formato dos campos do agendamento

**Regra de negócio**

- Todos os campos do corpo do `POST /api/agendamentos` são **obrigatórios** e devem ser enviados como texto **não vazio**: string vazia (`""`) ou composta apenas por espaços é rejeitada.
- `data` deve estar no formato `YYYY-MM-DD` **e** corresponder a uma data real do calendário.
- `horaInicio` e `horaFim` devem estar no formato `HH:MM`, com hora em 00–23 e minuto em 00–59.

**Motivação**

- A checagem anterior validava apenas `typeof === "string"`, o que deixava passar string vazia e, principalmente, **horário malformado**. `"7:00"` passava da comparação textual de `isHorarioPermitido` (pois `"7" > "0"`) e era gravado no banco, corrompendo a ordenação da agenda.
- Validar o formato antes das regras de horário garante que os validadores existentes recebam sempre strings em `HH:MM`.

**Implementação**

- **Back‑end** (`src/app/api/agendamentos/route.ts`): a checagem de tipo original (que devolve *"Todos os campos são obrigatórios."*) roda **primeiro** e não foi alterada. Em seguida, `getErroCamposObrigatorios` (`src/lib/validations.ts`) devolve a primeira mensagem específica encontrada — preenchimento, formato da data, formato do horário — com status **400**.
- **Front‑end** (`src/components/schedule/NovoAgendamentoModal.tsx`): o `validar()` original continua com as suas três verificações e ganhou `isDataValida` e `getSlotError`, reaproveitando as mesmas funções do servidor para que formulário e API falhem com as mesmas mensagens.

**Resposta da API**

- `400 Bad Request` com o corpo `{ "error": "<mensagem>" }`. Mensagens possíveis: *"O campo `<campo>` é obrigatório."*, *"Data inválida. Use o formato YYYY-MM-DD."*, *"Horário de início inválido. Use o formato HH:MM."*, *"Horário de fim inválido. Use o formato HH:MM."*

**Testes**

- `src/lib/__tests__/criar-agendamento.test.ts` e `src/lib/__tests__/validations.test.ts`.

---

# RN15 – Grade de 30 minutos no corpo da requisição

**Regra de negócio**

- `horaInicio` e `horaFim` devem estar alinhados na grade de 30 minutos da agenda: minuto `:00` ou `:30`.

**Motivação**

- A agenda é desenhada em blocos de 30 minutos (`SLOT_MINUTES`, `src/lib/schedule.ts`) e a comparação de sobreposição (`temConflito`) pressupõe que os horários caiam nessa grade.

**Implementação**

- `isNaGradeDe30min` (`src/lib/validations.ts`) é aplicada no endpoint, devolvendo **400** com *"O horário de início/fim deve estar alinhado em blocos de 30 minutos."*.
- O `cleanStore` da rota **foi mantido**: ele continua normalizando os registros já existentes no store. Registramos aqui que ele reescreve dados gravados e roda antes do cálculo de conflito — é dívida técnica conhecida, fora do escopo desta entrega.

**Consequência observada**

- Com a grade de 30 minutos **e** a exigência de `fim > início`, o menor delta possível é de 30 minutos. Isso torna a regra `isDuracaoMinima` **inalcançável pela rota**: ela não é o que impede uma reserva curta, e sim a grade combinada com `fim > início`. A função continua exercitada pelo formulário de edição, que monta o horário de fim a partir da grade visual.

**Duração mínima: 30 minutos**

- A duração mínima é de **30 minutos** (`MIN_DURATION_MINUTES = 30`, `src/lib/validations.ts`), conforme a especificação.
- Anteriormente a constante valia **29**. A causa era um hack em `generateTimeSlots` (`src/lib/schedule.ts`), em que o slot das `:30` era encurtado em um minuto e terminava em `:59` (10:30–10:59, isto é, 29 minutos). O desvio foi introduzido apenas para que um bloco de 30 minutos não fosse rejeitado por `isDuracaoMinima`.
- O hack era **desnecessário**: `getBookingStatus` compara com `>=`, que já trata a igualdade (uma reserva 10:00–10:30 casa com o slot 10:00–10:30). Ele não era exigido nem pelo marcador visual da grade nem pela detecção de conflito.
- A grade passou a usar `SLOT_MINUTES` em todos os blocos, com a soma em minutos totais para que o último slot do dia feche em **17:00** (16:30–17:00) em vez de transbordar para 17:30. O resultado é idêntico à grade do formulário de criação (`SLOTS_INICIO`/`SLOTS_FIM`, `src/components/schedule/NovoAgendamentoModal.tsx`): 18 slots por dia, de 08:00 a 16:30, cada um com 30 minutos.
- **Nenhuma funcionalidade foi removida.** A quantidade de slots, o layout, as interações e a detecção de conflito seguem iguais; apenas o horário de fim exibido do bloco das `:30` passou de `:59` para `:00`, deixando de ser um valor que nunca existiu no banco.

**Testes**

- `src/lib/__tests__/validations.test.ts` referencia a constante `MIN_DURATION_MINUTES` exportada, para não depender do número.
- `src/lib/__tests__/schedule.test.ts` trava a grade: 18 slots, 30 minutos cada, contiguidade, último slot fechando em 17:00 e o guard de que **todo slot isolado passa em `isSlotValido`** (regressão do `:59`).
