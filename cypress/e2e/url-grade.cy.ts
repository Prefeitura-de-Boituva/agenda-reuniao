/// <reference types="cypress" />

/**
 * A Grade precisa escrever a sala e a semana escolhidas no endereço.
 *
 * Antes o clique só mexia em estado React + `localStorage`: a grade trocava na
 * hora, mas a URL continuava com a sala antiga e o `?room=` vencia o estado salvo
 * no reload — recarregar ou compartilhar o link descartava a seleção.
 *
 * Sem banco em jogo: as asserções são sobre a rota e sobre qual botão está
 * pressionado, que independem dos agendamentos carregarem ou não.
 */

function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function proximoDiaUtilISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return paraISO(d);
}

function somarDiasISO(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return paraISO(new Date(ano, mes - 1, dia + dias));
}

const hojeISO = paraISO(new Date());
const data = proximoDiaUtilISO();
const salaAtiva = () => cy.get('button[aria-pressed="true"]');

/**
 * O primeiro clique pode chegar antes de o React anexar os handlers e não ter
 * efeito nenhum; repete até a URL responder, sem clicar de novo quando já mudou.
 */
function clicarAteUrl(contem: string, agir: () => void) {
  const tentar = (restantes: number) => {
    cy.location("search").then((search) => {
      if (search.includes(contem)) return;
      expect(restantes, `tentativas para ver "${contem}" na URL`).to.be.greaterThan(0);
      agir();
      cy.wait(250);
      tentar(restantes - 1);
    });
  };
  tentar(6);
}

describe("Sala e semana da Grade refletidas na URL", () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.visit(`/grade?date=${data}&room=sala-azul`);
    cy.get('[aria-label="Grade de horários da semana"]').should("be.visible");
  });

  it("escreve a sala clicada no ?room= sem perder a data", () => {
    salaAtiva().should("contain.text", "Sala Azul");

    clicarAteUrl("room=sala-verde", () => cy.contains("button", "Sala Verde").click());

    cy.location("search").should("include", `date=${data}`);
    salaAtiva().should("contain.text", "Sala Verde");
  });

  it("mantém a sala clicada depois do reload", () => {
    clicarAteUrl("room=sala-verde", () => cy.contains("button", "Sala Verde").click());

    cy.reload();
    cy.get('[aria-label="Grade de horários da semana"]').should("be.visible");

    // O bug: a sala da URL antiga vencia a escolha salva e volta para a Azul.
    cy.location("search").should("include", "room=sala-verde");
    salaAtiva().should("contain.text", "Sala Verde");
  });

  it("desloca o ?date= ao trocar de semana e volta para hoje", () => {
    clicarAteUrl(`date=${somarDiasISO(data, 7)}`, () =>
      cy.get('[aria-label="Próxima semana"]').click()
    );

    clicarAteUrl(`date=${hojeISO}`, () => cy.contains("button", "Hoje").click());
    salaAtiva().should("contain.text", "Sala Azul");
  });
});

export {};
