describe("RN12 – bloqueio de agendamento em horário passado (UI)", () => {
  it("a modal Novo Agendamento impede a submissão de horário já passado no dia atual", () => {
    cy.intercept("POST", "/api/agendamentos").as("createBooking");

    cy.visit("/grade");
    cy.contains("Novo agendamento").click();
    cy.get("[role='dialog']").should("be.visible");

    // Preenche o campo obrigatório (Nome) para a validação nativa do HTML
    // (required) não bloquear o submit antes de o código React rodar.
    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Nome")
        .invoke("attr", "for")
        .then((id) => cy.get(`[id="${id}"]`).type("Usuário teste RN12"));
    });

    // Congela apenas o Date do navegador às 20h do dia atual: assim todos os
    // slots da grade (08:00–16:30) já terão passado. setHours(20) mantém a
    // mesma data local de hoje (fuso-alvo do projeto: UTC-3).
    const fakedNow = new Date();
    fakedNow.setHours(20, 0, 0, 0);
    cy.clock(fakedNow, ["Date"]);

    cy.get("[role='dialog']").within(() => {
      cy.get("#inicio-select").should("have.value", "08:00");
      cy.get("button[type='submit']").click();
    });

    // A UI bloqueia antes de chamar a API e exibe a mensagem
    cy.get("#error-message").should("contain", "Horário já passou no dia atual.");
    cy.get("@createBooking.all").should("have.length", 0);
  });
});