/// <reference types='cypress' />

// Sem import/export o arquivo é um "script" para o TypeScript e o `toISODate`
// abaixo colidiria com o de mesmo nome em `horarios-ocupados.cy.ts`.
export {};

// Critérios de aceitação da issue #66 — "Prioridade 0" para reuniões do prefeito.
//
// O papel vem de `GET /api/acesso`, então o front é exercitado com stub do papel
// (o servidor de teste não precisa da senha do Gabinete). As regras do servidor
// — papel obrigatório, sala que permite, sobreposição sem apagar, auditoria —
// estão em `src/app/api/agendamentos/__tests__/prioridade-zero.test.ts` e nos
// dois últimos blocos deste spec, que chamam a API de verdade.
const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const MSG_SEM_PAPEL =
  'Apenas o Gabinete do Prefeito pode criar agendamentos com Prioridade 0.';

describe('Prioridade 0 — controle condicionado ao papel', () => {
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

  const opcaoInicio = (hora: string) => cy.get(`#inicio-select option[value="${hora}"]`);

  const abrirModal = (papel: 'NORMAL' | 'PREFEITO') => {
    cy.viewport(1280, 900);
    cy.clock(agora, ['Date']);
    cy.intercept('GET', '/api/acesso', { body: { papel } }).as('acesso');
    cy.intercept('GET', /\/api\/agendamentos\?/, (req) => {
      const url = new URL(req.url);
      if (url.searchParams.get('sala') === 'Sala Azul' && url.searchParams.get('data') === hoje) {
        return req.reply({ body: [reservaAzul] });
      }
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
  };

  it('não mostra o controle para quem não é do Gabinete', () => {
    abrirModal('NORMAL');

    cy.get('#prioridade-zero-toggle').should('not.exist');
    // O bloqueio da issue #62 continua valendo para esse papel.
    opcaoInicio('10:00').should('be.disabled').and('contain.text', '(Ocupado)');
  });

  it('mostra o controle para o Gabinete e libera o horário ocupado ao ativá-lo', () => {
    abrirModal('PREFEITO');

    cy.get('#prioridade-zero-toggle').should('exist').and('not.be.checked');
    // Antes de ativar, nada muda em relação à issue #62.
    opcaoInicio('10:00').should('be.disabled');

    cy.get('#prioridade-zero-toggle').check();
    opcaoInicio('10:00').should('not.be.disabled').and('contain.text', '(Ocupado)');
  });

  it('esconde o controle quando a sala não permite Prioridade 0', () => {
    abrirModal('PREFEITO');

    cy.get('#prioridade-zero-toggle').should('exist');
    cy.get('#sala-select').select('Sala Verde');
    cy.get('#prioridade-zero-toggle').should('not.exist');
  });

  it('exige a segunda confirmação e envia prioridade PREFEITO', () => {
    abrirModal('PREFEITO');

    let corpoEnviado: { prioridade?: string } = {};
    cy.intercept('POST', '/api/agendamentos', (req) => {
      corpoEnviado = req.body as { prioridade?: string };
      req.reply({
        statusCode: 201,
        body: {
          id: 'b-nova-prefeito',
          nome: req.body.nome,
          departamento: req.body.departamento,
          sala: req.body.sala,
          data: req.body.data,
          horaInicio: req.body.horaInicio,
          horaFim: req.body.horaFim,
          prioridade: 'PREFEITO',
          reservasConflitadas: [reservaAzul],
        },
      });
    }).as('criar');

    cy.get('#prioridade-zero-toggle').check();
    cy.get('#inicio-select').select('10:00');

    // O campo Nome é ligado pelo `for` do label, não tem id fixo.
    cy.get("[role='dialog']").within(() => {
      cy.contains('label', 'Nome')
        .invoke('attr', 'for')
        .then((id) => cy.get(`[id="${id}"]`).type('Reunião do Prefeito'));
    });
    cy.get('#departamento-select').select('Chefia de Gabinete');
    cy.get('button[type="submit"]').should('not.be.disabled').click();

    // Primeira confirmação foi ligar o controle; a segunda é um modal dedicado.
    cy.contains("[role='dialog']", 'Confirmar Prioridade 0')
      .should('be.visible')
      .and('contain.text', 'Reunião Ocupada')
      .and('contain.text', 'Secretaria Municipal Obras Públicas')
      .and('contain.text', 'Confirma agendamento com Prioridade 0?');
    cy.contains('button', 'Confirmar Prioridade 0').click();

    cy.wait('@criar').then(() => {
      expect(corpoEnviado.prioridade).to.eq('PREFEITO');
    });

    // A resposta avisa quem será notificado para remarcar.
    cy.contains('Reunião agendada com Prioridade 0').should('be.visible');
    cy.contains('avisados para remarcar').should('be.visible');

    // A reserva sobreposta continua na grade, e o bloco passa a exibir os dois
    // destaques: "Prefeito" (Prioridade 0) e "em conflito" (mais de uma reserva).
    cy.get('[title="Reserva com Prioridade 0 do Gabinete do Prefeito"]').should('exist');
    cy.get('[title^="Mais de uma reserva neste horário"]')
      .should('exist')
      .and('contain.text', 'em conflito');
  });
});

// Validação do servidor: esconder o controle no front não basta, chamadas diretas
// precisam ser recusadas. O servidor de teste não define
// `ACCESS_PASSWORD_PREFEITO`, então nenhuma sessão tem o papel PREFEITO aqui.
describe('Prioridade 0 — validação no servidor', () => {
  const em30Dias = toISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const corpo = {
    nome: 'Tentativa sem papel',
    departamento: 'Chefia de Gabinete',
    sala: 'Sala Azul',
    data: em30Dias,
    horaInicio: '16:00',
    horaFim: '16:30',
  };

  it('sem sessão o papel é NORMAL', () => {
    cy.request('GET', '/api/acesso').then((res) => {
      expect(res.body.papel).to.eq('NORMAL');
    });
  });

  it('recusa Prioridade 0 de quem não tem o papel, sem gravar nada', () => {
    cy.request({
      method: 'POST',
      url: '/api/agendamentos',
      body: { ...corpo, prioridade: 'PREFEITO' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
      expect(res.body.error).to.eq(MSG_SEM_PAPEL);
    });

    cy.request({
      method: 'GET',
      url: `/api/agendamentos?sala=${encodeURIComponent(corpo.sala)}&data=${em30Dias}`,
    }).then((res) => {
      expect(res.body).to.deep.eq([]);
    });
  });

  it('recusa valor de prioridade fora do enum', () => {
    cy.request({
      method: 'POST',
      url: '/api/agendamentos',
      body: { ...corpo, prioridade: 'URGENTE' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});
