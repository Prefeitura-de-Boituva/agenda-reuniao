/// <reference types="cypress" />

/**
 * Cancelamento de agendamento — DELETE /api/agendamentos/[id]
 *
 * Cobre o fluxo completo pela UI: abrir a modal, errar o departamento (403),
 * acertar em caixa alta (200, case-insensitive) e confirmar a remoção da grade.
 *
 * O banco é um store em memória por processo, então o agendamento semeado via
 * `cy.request` é o mesmo que a tela lê e o mesmo que a rota DELETE remove.
 *
 * Não falsificamos o relógio: agendamentos são semeados sempre no próximo dia
 * útil, que já é futuro para o servidor. A semana exibida é escolhida pela query
 * `?date=` da própria página da grade.
 *
 * Cada teste começa limpando o dia, para não depender (nem depender de sobras)
 * do estado acumulado do servidor de desenvolvimento.
 */

const SALA = "Sala Azul";
const ROOM_ID = "sala-azul";
const DEPARTAMENTO =
  "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças";

/** Próximo dia útil a partir de agora – sempre futuro para o servidor. */
function proximaDataUtil(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Remove tudo que existe na sala/data, para o teste começar de um estado conhecido. */
function limparDia(data: string) {
  return cy
    .request({
      url: `/api/agendamentos?sala=${encodeURIComponent(SALA)}&data=${data}`,
    })
    .then((res) => {
      const agendamentos = res.body as Array<{ id: string }>;
      // As requisições são enfileiradas aqui e executadas em ordem pelo Cypress.
      agendamentos.forEach((agendamento) => {
        cy.request({
          method: "DELETE",
          url: `/api/agendamentos/${agendamento.id}`,
          body: { departamento: DEPARTAMENTO },
          failOnStatusCode: false,
        });
      });
    });
}

/** Semeia um agendamento real na API e devolve o id gerado pelo servidor. */
function semearAgendamento(
  nome: string,
  horaInicio: string,
  horaFim: string,
  data: string
) {
  return cy
    .request({
      method: "POST",
      url: "/api/agendamentos",
      body: {
        nome,
        departamento: DEPARTAMENTO,
        sala: SALA,
        data,
        horaInicio,
        horaFim,
      },
    })
    .then((res) => {
      expect(res.status, `POST /api/agendamentos`).to.eq(201);
      return res.body.id as string;
    });
}

/** Abre a grade já na semana que contém a data semeada. */
function abrirGradeNaData(data: string) {
  cy.visit(`/grade?date=${data}&room=${ROOM_ID}`);
  cy.get('[aria-label="Grade de horários da semana"]').should("be.visible");
}

/** O input do departamento usa `useId()`, então o id é resolvido via `for` do label. */
function digitarDepartamento(valor: string) {
  cy.get("[role='dialog']").within(() => {
    cy.contains("label", "Informe o departamento para confirmar o cancelamento")
      .invoke("attr", "for")
      .then((id) => cy.get(`[id="${id}"]`).clear().type(valor));
  });
}

function confirmarCancelamento() {
  cy.get("[role='dialog']").contains("button", "Confirmar cancelamento").click();
}

function abrirModalDeCancelamento(nome: string) {
  // A célula ocupada tem aria-label "Cancelar agendamento de <nome> das ...", e o
  // botão do lixeira dentro dela tem aria-label exato "Cancelar agendamento".
  // Um agendamento de 1h ocupa dois slots de 30min, então há mais de uma célula
  // com esse rótulo – clicamos na primeira.
  cy.get(`[aria-label^="Cancelar agendamento de ${nome}"]`)
    .first()
    .find('[aria-label="Cancelar agendamento"]')
    .click();
  cy.get("[role='dialog']").should("be.visible");
}

describe("Cancelamento de agendamento — DELETE /api/agendamentos/[id]", () => {
  const dataISO = paraISO(proximaDataUtil());

  after(() => {
    // Devolve o servidor de desenvolvimento ao estado anterior aos testes.
    limparDia(dataISO);
  });

  it("recusa com 403 quando o departamento informado não corresponde", () => {
    const nome = "Teste Departamento Errado";

    limparDia(dataISO);
    semearAgendamento(nome, "10:00", "11:00", dataISO);

    cy.intercept("DELETE", "/api/agendamentos/*").as("cancelar");

    abrirGradeNaData(dataISO);
    abrirModalDeCancelamento(nome);

    digitarDepartamento("Secretaria Municipal de Assuntos Jurídicos");
    confirmarCancelamento();

    cy.wait("@cancelar").its("response.statusCode").should("eq", 403);

    // A mensagem exibida é genérica: não revela o departamento cadastrado.
    cy.get("#cancel-error-message")
      .should("contain", "Departamento não autorizado a cancelar este agendamento.")
      .and("not.contain", DEPARTAMENTO);

    // A modal continua aberta e o agendamento segue na grade (nada foi removido).
    cy.get("[role='dialog']").should("be.visible");
    cy.get(`[aria-label^="Cancelar agendamento de ${nome}"]`).should("exist");
  });

  it("cancela com 200 quando o departamento confere em caixa alta e remove da grade", () => {
    const nome = "Teste Departamento Correto";

    limparDia(dataISO);
    semearAgendamento(nome, "14:00", "15:00", dataISO);

    cy.intercept("DELETE", "/api/agendamentos/*").as("cancelar");

    abrirGradeNaData(dataISO);
    abrirModalDeCancelamento(nome);

    // Maiúsculas: valida que a comparação no servidor é case-insensitive.
    digitarDepartamento(DEPARTAMENTO.toUpperCase());
    confirmarCancelamento();

    cy.wait("@cancelar").then(({ request, response }) => {
      expect(response?.statusCode).to.eq(200);
      // O departamento vai no body, nunca na query string.
      expect(request.body).to.deep.eq({
        departamento: DEPARTAMENTO.toUpperCase(),
      });
    });

    // Modal fecha e o aviso de sucesso aparece.
    cy.get("[role='dialog']").should("not.exist");
    cy.contains('[role="status"]', "Agendamento cancelado com sucesso!").should(
      "be.visible"
    );

    // O agendamento sumiu da grade: a célula voltou a ser "Agendar".
    cy.get(`[aria-label^="Cancelar agendamento de ${nome}"]`).should("not.exist");
    cy.get(`[aria-label^="Agendar ${dataISO} das 14:00"]`).should("exist");

    // E também sumiu da API: um id que não existe devolve 404.
    cy.request({
      method: "DELETE",
      url: "/api/agendamentos/id-inexistente",
      body: { departamento: DEPARTAMENTO },
      failOnStatusCode: false,
    })
      .its("status")
      .should("eq", 404);
  });
});
