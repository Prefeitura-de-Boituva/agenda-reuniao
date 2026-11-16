/// <reference types='cypress' />

// Regressão de fuso (RN12 na edição).
//
// O formulário de edição mantinha uma cópia local de `isPastToday` que calculava
// "hoje" com `toISOString()` — em UTC. No fuso de Boituva (UTC-3), entre 21h e 24h
// o "hoje" UTC já era o dia seguinte, a comparação de data falhava e o bloqueio de
// horário passado era pulado em silêncio.
//
// Este spec congela o relógio às 22:00 de hoje e abre a edição de uma reserva do
// próprio dia: a mensagem precisa aparecer.
//
// A reserva é servida por um stub do `GET /api/agendamentos`, que é de onde a grade
// realmente lê. Criá-la via POST não funciona neste cenário: o servidor usa o
// relógio real e a RN12 recusaria o horário das 09:00 na maior parte do dia.
describe('Edição de agendamento — bloqueio de horário já passado no dia corrente', () => {
  const toISODate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // 22:00 de hoje no fuso local: o instante UTC correspondente já pertence a amanhã.
  const agora = new Date();
  agora.setHours(22, 0, 0, 0);
  const hoje = toISODate(agora);

  const reserva = {
    id: 'b-fuso-1',
    nome: 'Reunião da madrugada',
    departamento: 'Secretaria Municipal Obras Públicas',
    sala: 'Sala Azul',
    data: hoje,
    horaInicio: '09:00',
    horaFim: '10:00',
    criadoEm: `${hoje}T08:00:00.000Z`,
  };

  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.clock(agora, ['Date']);
    cy.intercept('GET', /\/api\/agendamentos\?/, (req) => {
      const url = new URL(req.url);
      const ehDaReserva =
        url.searchParams.get('sala') === reserva.sala &&
        url.searchParams.get('data') === hoje;
      req.reply({ statusCode: 200, body: ehDaReserva ? [reserva] : [] });
    }).as('agendamentos');

    cy.visit(`/grade?date=${hoje}&room=sala-azul`);
    cy.wait('@agendamentos');
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
