/// <reference types="cypress" />

/**
 * RN16 — bloqueio de agendamento em datas anteriores ao dia atual.
 *
 * Cobre a API (400 com mensagem padronizada), o `min` do date picker e o
 * bloqueio de abertura do modal de criação ao clicar em um slot de um dia
 * passado na grade.
 */

const SALA = "Sala Azul";
const ROOM_ID = "sala-azul";
const DEPARTAMENTO =
  "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças";
const MSG_DATA_PASSADA =
  "Erro 400: Não é possível agendar para uma data passada.";

function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function hojeISO(): string {
  return paraISO(new Date());
}

/**
 * Último dia útil anterior a hoje. Usamos um dia útil (e não simplesmente
 * "ontem") porque a grade só renderiza segunda–sexta e porque um domingo é
 * normalizado por `getWeekStart` para a semana seguinte, o que impediria o
 * teste de encontrar uma célula de dia passado quando hoje é segunda-feira.
 */
function diaUtilPassadoISO(): string {
  const d = new Date();
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return paraISO(d);
}

/**
 * Visita a grade e aguarda a hidratação do componente client. No `next dev`
 * a primeira visita compila a rota e o HTML pode chegar antes de os handlers
 * React serem anexados; sem essa espera um clique pode ser perdido (e o teste
 * de bloqueio passaria sem exercitar o guard).
 */
function visitarGrade(url: string) {
  cy.visit(url);
  cy.get('[aria-label="Grade de horários da semana"]').should("be.visible");
  cy.wait(1000);
}

describe("RN16 — datas passadas", () => {
  it("a API rejeita data anterior ao dia atual com 400 e mensagem clara", () => {
    cy.request({
      method: "POST",
      url: "/api/agendamentos",
      body: {
        nome: "Teste RN16",
        departamento: DEPARTAMENTO,
        sala: SALA,
        data: diaUtilPassadoISO(),
        horaInicio: "10:00",
        horaFim: "11:00",
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.eq(MSG_DATA_PASSADA);
    });
  });

  it("o date picker do modal tem min igual à data local de hoje", () => {
    visitarGrade("/grade");
    cy.contains("Novo agendamento").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog'] input[type='date']").should(
      "have.attr",
      "min",
      hojeISO()
    );
  });

  it("não abre o modal de criação ao clicar em um slot de um dia passado", () => {
    const diaPassado = diaUtilPassadoISO();

    visitarGrade(`/grade?date=${diaPassado}&room=${ROOM_ID}`);

    // A sala tem poucos blocos mockados; o primeiro slot livre do dia passado
    // é suficiente para exercitar o guard do `openCreateModal`.
    cy.get(`[aria-label^="Agendar ${diaPassado}"]`).first().click();

    cy.get("[role='dialog']").should("not.exist");
  });
});

// Mantém este spec como módulo: evita colisão de nomes globais com outros
// specs do Cypress (que também declaram SALA/ROOM_ID/DEPARTAMENTO).
export {};
