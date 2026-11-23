/// <reference types='cypress' />

// Critérios de aceitação da issue #62 — "Bloqueio de Horários Já Agendados".
//
// O modal de novo agendamento já marcava os horários ocupados, mas nada afirmava
// isso: os quatro pontos propostos (prop `existingBookings`, re-sincronização por
// sala/data, indicação visual nas options, botão "Confirmar" barrado em conflito)
// só tinham teste unitário da função pura `findBookingConflict`. Este spec fecha
// a lacuna do item "Definir critérios de aceitação para cada issue" exercitando a
// UI real.
//
// Os agendamentos vêm de um stub do `GET /api/agendamentos`, então o banco não é
// tocado nestes quatro primeiros critérios; o último critério (fallback do
// servidor) é intencionalmente de API e limpa o que cria.
const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe('Novo Agendamento — bloqueio de horários já agendados', () => {
  // 08:00 de hoje: nenhum horário do cenário cai na RN12 (horário passado no dia).
  const agora = new Date();
  agora.setHours(8, 0, 0, 0);
  const hoje = toISODate(agora);

  const reservaAzul = {
    id: 'b-ocupado-azul',
    nome: 'Reunião Ocupada',
    departamento: 'Secretaria Municipal Obras Públicas',
    sala: 'Sala Azul',
    data: hoje,
    horaInicio: '10:00',
    horaFim: '11:00',
    criadoEm: `${hoje}T08:00:00.000Z`,
  };

  const reservaVerde = {
    id: 'b-ocupado-verde',
    nome: 'Conversa da Gestão',
    departamento: 'Chefia de Gabinete',
    sala: 'Sala Verde',
    data: hoje,
    horaInicio: '14:00',
    horaFim: '15:00',
    criadoEm: `${hoje}T08:00:00.000Z`,
  };

  const opcaoInicio = (hora: string) => cy.get(`#inicio-select option[value="${hora}"]`);

  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.clock(agora, ['Date']);
    cy.intercept('GET', /\/api\/agendamentos\?/, (req) => {
      const url = new URL(req.url);
      const sala = url.searchParams.get('sala');
      const data = url.searchParams.get('data');
      if (sala === reservaAzul.sala && data === hoje) return req.reply({ body: [reservaAzul] });
      if (sala === reservaVerde.sala && data === hoje) return req.reply({ body: [reservaVerde] });
      req.reply({ body: [] });
    }).as('agendamentos');

    cy.visit('/grade?room=sala-azul');
    // O primeiro clique pode cair antes da hidratação do React: repete até o
    // modal montar, sem clicar de novo quando já está aberto.
    const abrirPeloBotao = (restantes: number) => {
      cy.get('body').then(($body) => {
        if ($body.find("[role='dialog']").length > 0) return;
        expect(restantes, 'tentativas de abrir o modal').to.be.greaterThan(0);
        cy.contains('button', 'Novo agendamento').click();
        cy.wait(250);
        abrirPeloBotao(restantes - 1);
      });
    };
    abrirPeloBotao(6);
    cy.get("[role='dialog']").should('be.visible');
    cy.wait('@agendamentos');
  });

  it('desabilita, rotula e explica a opção do horário já agendado', () => {
    // Cobertura total do agendamento das 10:00 às 11:00.
    opcaoInicio('10:00')
      .should('be.disabled')
      .and('contain.text', '(Ocupado)')
      .and('have.attr', 'title', 'Horário já agendado por Reunião Ocupada — Secretaria Municipal Obras Públicas');
    opcaoInicio('10:30').should('be.disabled').and('contain.text', '(Ocupado)');

    // Estilo proposto na issue, aplicado à opção ocupada.
    opcaoInicio('10:00').should('have.class', 'opacity-50').and('have.class', 'cursor-not-allowed');
  });

  it('mantém habilitados os horários que apenas encostam no agendamento existente', () => {
    // Adjacência não é sobreposição: 09:00–09:30 termina quando começa, e
    // 11:00–11:30 começa quando o outro termina.
    opcaoInicio('09:00').should('not.be.disabled').and('not.contain.text', '(Ocupado)');
    opcaoInicio('11:00').should('not.be.disabled');
  });

  it('reatualiza os horários quando a sala muda, sem recarregar a página', () => {
    cy.get('#sala-select').select('Sala Verde');

    // Agora quem está ocupado é 14:00 (Sala Verde) e 10:00 volta a ficar livre.
    opcaoInicio('14:00').should('be.disabled').and('contain.text', '(Ocupado)');
    opcaoInicio('10:00').should('not.be.disabled');
  });

  it('desabilita o Confirmar e explica o conflito quando a seleção passa a coincidir com outro agendamento', () => {
    // 14:00 está livre na Sala Azul, então a escolha é aceita...
    cy.get('#inicio-select').select('14:00');
    cy.get('button[type="submit"]').should('not.be.disabled');

    // ...e passa a conflitar ao trocar para a sala que tem reserva naquele horário.
    cy.get('#sala-select').select('Sala Verde');

    cy.get("[role='alert']").should('be.visible');
    cy.get("[role='alert']")
      .invoke('text')
      .then((texto) => {
        expect(texto.replace(/\s+/g, ' ')).to.contain(
          'Conflito de horário com o agendamento de Conversa da Gestão (Chefia de Gabinete) das 14:00 às 15:00'
        );
      });
    cy.get('button[type="submit"]').should('be.disabled');
  });
});

// "Manter validação backend como fallback": mesmo com a UI bloqueando a escolha,
// a API continua recusando a sobreposição — é o que protege chamadas diretas e a
// corrida entre duas abas.
describe('API de agendamentos — recusa de sobreposição (fallback do servidor)', () => {
  const em30Dias = toISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const corpo = {
    nome: 'Fallback do servidor',
    departamento: 'Chefia de Gabinete',
    sala: 'Sala Amarela',
    data: em30Dias,
    horaInicio: '16:00',
    horaFim: '16:30',
  };

  it('responde 409 para o mesmo horário e mantém o banco limpo', () => {
    let criadoId = '';

    cy.request('POST', '/api/agendamentos', corpo).then((res) => {
      expect(res.status).to.eq(201);
      criadoId = res.body.id;
    });

    cy.request({ method: 'POST', url: '/api/agendamentos', body: corpo, failOnStatusCode: false }).then(
      (res) => {
        expect(res.status).to.eq(409);
        expect(res.body.error).to.eq('Horário conflita com agendamento existente');
      }
    );

    cy.then(() => {
      cy.request({
        method: 'DELETE',
        url: `/api/agendamentos/${criadoId}`,
        body: { departamento: corpo.departamento },
        failOnStatusCode: false,
      });
      cy.request({
        method: 'GET',
        url: `/api/agendamentos?sala=${encodeURIComponent(corpo.sala)}&data=${em30Dias}`,
      }).then((res) => {
        expect(res.body).to.deep.eq([]);
      });
    });
  });
});
