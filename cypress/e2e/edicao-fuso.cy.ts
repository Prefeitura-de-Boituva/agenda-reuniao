/// <reference types='cypress' />

// Regressão de fuso (RN12 na edição).
//
// O formulário de edição mantinha uma cópia local de `isPastToday` que calculava
// "hoje" com `toISOString()` — em UTC. No fuso de Boituva (UTC-3), entre 21h e 24h
// o "hoje" UTC já era o dia seguinte, a comparação de data falhava e o bloqueio de
// horário passado era pulado em silêncio.
//
// Este spec congela o relógio às 22:00 de hoje e abre a edição de uma reserva do
// próprio dia: a mensagem precisa aparecer. Sem o banco em jogo — a reserva entra
// pela grade via `localStorage`, que é o mesmo caminho que o usuário usa.
describe('Edição de agendamento — bloqueio de horário já passado no dia corrente', () => {
  const STORAGE_KEY = 'agenda-reuniao:grade:v1';

  const toISODate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  /** Espelha `getWeekStart`: segunda-feira, com domingo pulando para a segunda seguinte. */
  const weekStart = (d: Date): Date => {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (start.getDay() === 0) {
      start.setDate(start.getDate() + 1);
      return start;
    }
    start.setDate(start.getDate() - (start.getDay() - 1));
    return start;
  };

  // 22:00 de hoje no fuso local: o instante UTC correspondente já pertence a amanhã.
  const agora = new Date();
  agora.setHours(22, 0, 0, 0);
  const hoje = toISODate(agora);

  const reserva = {
    id: 'b-fuso-1',
    roomId: 'sala-azul',
    date: hoje,
    name: 'Reunião da madrugada',
    department: 'Secretaria Municipal Obras Públicas',
    startTime: '09:00',
    endTime: '10:00',
  };

  const estado = {
    overrides: {
      "sala-azul": {
        [hoje]: { upserts: [reserva], deletedIds: [] },
      },
    },
    selectedRoomId: 'sala-azul',
    weekStartIso: toISODate(weekStart(agora)),
  };

  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.clock(agora, ['Date']);
    cy.visit('/grade', {
      onBeforeLoad(win) {
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
      },
    });
    cy.contains('button', 'Sala Azul').should('exist');
    cy.get('[aria-label="Editar agendamento"]').first().click();
    cy.get("[role='dialog']").should('be.visible');
  });

  it('exibe o bloqueio da RN12 ao abrir a edição às 22h', () => {
    cy.get('[role="alert"]')
      .first()
      .should('contain.text', 'Horário já passou no dia atual.');
  });

  it('desabilita o Salvar enquanto o horário do dia já passou', () => {
    // O retorno antecipado de `handleSubmit` já barrava a gravação, mas o botão
    // permanecia clicável: o clique não dava nenhuma indicação além da mensagem.
    cy.contains('button', 'Salvar').should('be.disabled');
    cy.get("[role='dialog']").should('be.visible');
    cy.get('[role="alert"]').first().should('contain.text', 'Horário já passou no dia atual.');
  });
});
