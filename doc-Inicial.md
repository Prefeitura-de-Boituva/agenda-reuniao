# RN12 – Bloqueio de agendamento em horário passado (mesmo dia)

**Regra de negócio**
- Não é permitido agendar um horário que já tenha decorrido no dia corrente. Se a data do agendamento for hoje, o horário de início deve ser maior ou igual ao horário atual.

**Motivação**
- Garante que a grade reflita apenas possibilidades futuras, evitando confusão e entradas inconsistentes.

**Implementação**
- **Back‑end** (`src/app/api/agendamentos/route.ts`): a verificação `isPast` devolve 400 com a mensagem *"Horário já passou no dia atual."* antes de salvar.
- **Front‑end** (`src/components/schedule/ScheduleGrid.tsx` → `BookingFormModal`): a mesma verificação impede o submit e exibe a mensagem ao usuário.

**Código de erro**: `ERR_PAST_TIME`

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
