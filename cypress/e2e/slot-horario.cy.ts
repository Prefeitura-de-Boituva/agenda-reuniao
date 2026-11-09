/// <reference types='cypress' />

// Regressão: clicar num slot LIVRE da grade precisa abrir o Novo Agendamento
// já com o horário daquele slot. Antes, o modal sempre nascia em 08:00 e o
// usuário era obrigado a escolher o horário de novo.
//
// Sem banco em jogo: a grade renderiza os slots livres mesmo quando o GET
// /api/agendamentos falha, e nada é semeado nem gravado aqui.
describe('Criação de agendamento — horário herdado do slot livre', () => {
  const toISODate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const proximoDiaUtil = (d: Date): Date => {
    const amanha = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    while (amanha.getDay() === 0 || amanha.getDay() === 6) {
      amanha.setDate(amanha.getDate() + 1);
    }
    return amanha;
  };

  const agora = new Date();
  agora.setHours(9, 0, 0, 0);
  const amanha = toISODate(proximoDiaUtil(new Date()));

  // O primeiro clique pode cair antes da hidratação do React e não ter efeito;
  // repete até o modal montar, sem clicar de novo quando já está aberto.
  const abrirModal = (clique: () => void) => {
    const tentar = (restantes: number) => {
      cy.get('body').then(($body) => {
        if ($body.find("[role='dialog']").length > 0) return;
        expect(restantes, 'tentativas de abrir o modal').to.be.greaterThan(0);
        clique();
        cy.wait(250);
        tentar(restantes - 1);
      });
    };
    tentar(6);
    cy.get("[role='dialog']").should('be.visible');
  };

  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.clock(agora, ['Date']);
    cy.visit(`/grade?date=${amanha}&room=sala-azul`);
    cy.get('[aria-label="Grade de horários da semana"]').should('be.visible');
  });

  it('abre o modal com o início e o fim do slot clicado', () => {
    abrirModal(() =>
      cy.get(`[aria-label="Agendar ${amanha} das 10:00 às 10:30"]`).click()
    );
    cy.get('#inicio-select').should('have.value', '10:00');
    cy.get('#fim-select').should('have.value', '10:30');
  });

  it('mantém 08:00 como padrão quando aberto pelo botão Novo agendamento', () => {
    abrirModal(() => cy.contains('button', 'Novo agendamento').click());
    cy.get('#inicio-select').should('have.value', '08:00');
    cy.get('#fim-select').should('have.value', '08:30');
  });
});