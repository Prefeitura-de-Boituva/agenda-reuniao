/// <reference types='cypress' />

describe('Fluxos principais de agenda', () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // yyyy-mm-dd

  beforeEach(() => {
    cy.viewport(1024, 768);
    cy.visit('/');
    cy.wait(500);
    // go to grade page where schedule grid and "Novo agendamento" button exist
    cy.contains('Ver na Grade de Horários').click();
    cy.url().should('include', '/grade');
    cy.wait(500);
  });

  it('Fluxo 1 – Criar agendamento com sucesso e validar campos', () => {
    // abre modal
    cy.contains('Novo agendamento').click({ force: true });
    cy.get("[role='dialog']", { timeout: 10000 }).should('be.visible');

    // Preencher campos válidos
    cy.get('input[type="date"]').clear().type(dateStr);
    cy.get('#fim-select').select('09:30');
    cy.get('#inicio-select').select('09:00');
    cy.get('#sala-select').select(0); // primeira sala
    cy.get('label').contains('Assunto').parent().find('input').type('Reunião teste');
    cy.get('#department-select').select('TI');

    // confirma
    cy.contains('Confirmar').click({ force: true });
    cy.get("[role='dialog']", { timeout: 10000 }).should('not.exist');
    cy.contains('Reunião teste').should('be.visible');

    // validações negativas – nome obrigatório
    cy.wait(500);
    cy.contains('Novo agendamento').click({ force: true });
    cy.get("[role='dialog']").should('be.visible');
    cy.get('input[type="date"]').clear().type(dateStr);
    cy.get('#inicio-select').select('09:00');
    cy.wait(500);
    cy.get('#fim-select option').its('length').should('be.gte', 2);
    cy.get('#fim-select').select(1);
    cy.get('#sala-select').select(0);
    cy.get('#department-select').select('TI');
    // deixa nome vazio and submit — use form submit to ensure validation runs
    cy.get('label').contains('Assunto').parent().find('input').should('have.value', '');
    cy.get('form').submit();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="alert"]').should('exist').and('contain.text', 'Nome é obrigatório');
    // agora preenche nome e testa horário inválido
    cy.get('label').contains('Assunto').parent().find('input').type('Teste inválido');
    // force an invalid end time (earlier than start) and verify validation
    cy.get('#fim-select').invoke('val', '09:00').trigger('change');
    cy.get('#inicio-select').select('11:00');
    cy.get('#fim-select').invoke('val', '09:00').trigger('change');
    cy.get('[role="dialog"]').contains('Confirmar').click({ force: true });
    cy.get('#error-message').should('exist').and('contain.text', 'Horário de fim deve ser posterior ao início');
    // testa conflito de horário (mesmo intervalo)
    cy.wait(500);
    cy.contains('Novo agendamento').click({ force: true });
    cy.get("[role='dialog']").should('be.visible');
    cy.get('input[type="date"]').clear().type(dateStr);
    cy.get('#inicio-select').select('09:00');
    cy.wait(500);
    cy.get('#fim-select').select('09:30');
    cy.get('#sala-select').select(0);
    cy.get('label').contains('Assunto').parent().find('input').type('Conflito');
    cy.get('#department-select').select('TI');
    cy.contains('Confirmar').click({ force: true });
    cy.get('#external-error-message').should('exist')
      .and('contain.text', 'Conflito de horário');
  });

  it('Fluxo 2 – Visualizar agenda trocando salas e datas', () => {
    // Trocar de sala usando tabs (Sala 2)
    cy.contains('button', 'Sala Verde').click();
    // Verify active style (primary background on selected tab)
    cy.wait(500);
    cy.get('button').filter('.bg-primary-500').should('have.text', 'Sala Verde');
    // Trocar de data usando seletor de data
    cy.visit('/grade?date=2025-01-01&room=sala-azul');
    cy.wait(500);
    // Verificar slots – texto "LIVRE" indica disponível
    cy.contains('LIVRE').should('exist');
    // Um slot ocupado mostrará nome e departamento
    cy.get('td').not(':contains("LIVRE")').first().should('exist');
  });

  it('Fluxo 3 – Cancelar agendamento com diferentes departamentos e data passada', () => {
    // Cria agendamento futuro
    cy.contains('Novo agendamento').click();
    cy.get('input[type="date"]').clear().type(dateStr);
    cy.get('#inicio-select').select('14:00');
    cy.get('#fim-select').select('15:00');
    cy.get('#sala-select').select(0);
    cy.get('label').contains('Assunto').parent().find('input').type('Cancel Test');
    cy.get('#department-select').select('TI');
    cy.contains('Confirmar').click();
    cy.contains('Cancel Test').should('be.visible');

    // Abre modal de cancelamento
    cy.contains('Cancel Test').parents('td').find('[aria-label="Cancelar agendamento"]').click();
    cy.get("[role='dialog']").should('be.visible');
    // tenta cancelar com departamento errado
    cy.get('#department-select').select('RH');
    cy.contains('Confirmar cancelamento').click();
    cy.contains('Departamento incorreto').should('exist');
    // cancela com departamento correto
    cy.get('#department-select').select('TI');
    cy.contains('Confirmar cancelamento').click();
    cy.contains('Cancel Test').should('not.exist');

    // Reserva passada
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    const pastStr = past.toISOString().split('T')[0];
    // Navigate to the past week so the reservation is visible in the grid
    cy.visit(`/grade?date=${pastStr}&room=sala-azul`);
    cy.wait(500);
    cy.contains('Novo agendamento').click();
    cy.get("[role='dialog']").should('be.visible');
    cy.get('input[type="date"]').clear().type(pastStr);
    cy.get('#fim-select').select('09:30');
    cy.get('#inicio-select').select('09:00');
    cy.get('#sala-select').select(0);
    cy.get('label').contains('Assunto').parent().find('input').type('Past Reserva');
    cy.get('#department-select').select('TI');
    cy.contains('Confirmar').click();
    cy.wait(500);
    cy.contains('Past Reserva').should('be.visible');
    // tenta cancelar
    cy.contains('Past Reserva').parents('td').find('[aria-label="Cancelar agendamento"]').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('#department-select').select('TI');
    cy.contains('Confirmar cancelamento').click();
    cy.contains('Não é possível cancelar reservas passadas').should('exist');
  });
});
