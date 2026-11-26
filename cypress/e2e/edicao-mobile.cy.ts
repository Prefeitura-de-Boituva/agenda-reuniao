/// <reference types="cypress" />

/**
 * Edição de agendamento pela grade mobile.
 *
 * A grade é renderizada em duas cópias (a mobile, `md:hidden`, e a desktop). O
 * lápis de editar só existia na desktop, então no celular o slot ocupado abria
 * apenas o cancelamento e não havia como corrigir um nome ou horário.
 *
 * Não falsificamos o relógio: a reserva é semeada no próximo dia útil, sempre
 * futuro para a API, e os dias do acordeão mobile (que nascem recolhidos) são
 * abertos antes do clique.
 */

const SALA = "Sala Azul";
const ROOM_ID = "sala-azul";
const DEPARTAMENTO =
  "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças";
const SENHA = "senha-de-teste";
const NOME = "Teste Edicao Mobile";
const NOME_EDITADO = "Teste Edicao Mobile OK";

function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function proximaDataUtilISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return paraISO(d);
}

const data = proximaDataUtilISO();

function abrirDiasMobile() {
  // Só a cópia mobile tem botões "Expandir horários", então não há ambiguidade
  // com a grade desktop oculta neste viewport.
  cy.get('[aria-label^="Expandir horários"]').each(($dia) => {
    cy.wrap($dia).click();
  });
}

function limparDia() {
  return cy
    .request({
      url: `/api/agendamentos?sala=${encodeURIComponent(SALA)}&data=${data}`,
      failOnStatusCode: false,
    })
    .then((res) => {
      const agendamentos = res.body as Array<{ id: string }>;
      if (!Array.isArray(agendamentos)) return;
      agendamentos.forEach((agendamento) => {
        cy.request({
          method: "DELETE",
          url: `/api/agendamentos/${agendamento.id}`,
          body: { senha: SENHA, departamento: DEPARTAMENTO },
          failOnStatusCode: false,
        });
      });
    });
}

describe("Edição de agendamento no celular", () => {
  beforeEach(() => {
    limparDia();
    cy.request({
      method: "POST",
      url: "/api/agendamentos",
      body: {
        nome: NOME,
        departamento: DEPARTAMENTO,
        sala: SALA,
        data,
        horaInicio: "15:30",
        horaFim: "16:00",
        senha: SENHA,
      },
    }).its("status");
  });

  afterEach(limparDia);

  it("oferece editar o slot ocupado e grava a edição na API", () => {
    cy.viewport(390, 844);
    cy.intercept("PUT", "/api/agendamentos/*").as("editar");

    cy.visit(`/grade?date=${data}&room=${ROOM_ID}`);
    cy.get("section[aria-label='Grade de horários por dia']").should("be.visible");
    // A primeira visita no `next dev` pode chegar antes de os handlers serem
    // anexados; sem isso o clique no expansor é perdido.
    cy.wait(1000);

    abrirDiasMobile();

    cy.get(`[aria-label^="Editar agendamento de ${NOME}"]`)
      .should("have.length", 1)
      .click();

    cy.get("[role='dialog']").should("contain.text", "Editar Agendamento");
    cy.get("[role='dialog']")
      .contains("label", "Nome")
      .invoke("attr", "for")
      .then((id) => cy.get(`[id="${id}"]`).clear().type(NOME_EDITADO));
    cy.get("[role='dialog']").contains("button", "Salvar").click();

    cy.wait("@editar").its("response.statusCode").should("eq", 200);
    cy.get(`[aria-label^="Ver agendamento de ${NOME_EDITADO}"]`).should("exist");

    // A edição tem que sobreviver ao reload: gravou no banco, não só no estado
    // local da página.
    cy.reload();
    cy.get("section[aria-label='Grade de horários por dia']").should("be.visible");
    cy.wait(1000);
    abrirDiasMobile();
    cy.get(`[aria-label^="Ver agendamento de ${NOME_EDITADO}"]`).should("exist");
  });
});

export {};
