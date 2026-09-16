describe("Responsividade e Acessibilidade", () => {
  const viewports = [
    { name: "Mobile 320px", width: 320, height: 568 },
    { name: "Tablet 768px", width: 768, height: 1024 },
    { name: "Desktop 1024px", width: 1024, height: 768 },
    { name: "Desktop 1440px", width: 1440, height: 900 },
  ];

  viewports.forEach(({ name, width, height }) => {
    describe(name, () => {
      beforeEach(() => {
        cy.viewport(width, height);
        cy.visit("/");
      });

      it("deve carregar a pagina sem erros", () => {
        cy.get("body").should("be.visible");
      });

      it("header esta visivel e funcional", () => {
        cy.get("header").should("be.visible");
        cy.get("header a").should("have.attr", "href");
      });

      it("grade de horarios esta legivel", () => {
        cy.get("table").should("be.visible");
      });

      it("modais nao vazam do viewport", () => {
        cy.get("body").find("*").each(($el) => {
          const rect = $el[0].getBoundingClientRect();
          expect(rect.width).to.be.lessThan(width + 10);
        });
      });

      it("navegacao por teclado funciona - foco visivel", () => {
        cy.get("header button[aria-label='Abrir menu']").focus().should("be.focused");
      });

      it("contrast adequado (WCAG AA)", () => {
        cy.injectAxe();
        cy.checkA11y();
      });
    });
  });

  describe("Header Mobile Menu", () => {
    beforeEach(() => {
      cy.viewport(320, 568);
      cy.visit("/");
    });

    it("botao de menu abre e fecha corretamente", () => {
      cy.get("button[aria-label='Abrir menu']").should("be.visible");
      cy.get("button[aria-label='Abrir menu']").click();
      cy.get("#mobile-nav").should("be.visible");
      cy.get("button[aria-label='Fechar menu']").click();
      cy.get("#mobile-nav").should("not.be.visible");
    });

    it("links do menu mobile tem aria-current quando ativos", () => {
      cy.get("button[aria-label='Abrir menu']").click();
      cy.get("#mobile-nav a[aria-current='page']").should("exist");
    });
  });

  describe("Modais", () => {
    beforeEach(() => {
      cy.viewport(1024, 768);
      cy.visit("/grade");
    });

    it("botao Novo agendamento abre modal responsivo", () => {
      cy.contains("Novo agendamento").click();
      cy.get("[role='dialog']").should("be.visible");
    });

    it("botao fechar fecha o modal", () => {
      cy.contains("Novo agendamento").click();
      cy.get("button[aria-label='Fechar']").click();
      cy.get("[role='dialog']").should("not.exist");
    });
  });
});