// O clique pode cair antes da hidratação do React e não ter efeito;
// repete até o alvo montar, sem clicar de novo quando já está aberto.
function repetirAte(condicao: string, clique: () => void, rotulo: string) {
  const tentar = (restantes: number) => {
    cy.get("body").then(($body) => {
      if ($body.find(condicao).length > 0) return;
      expect(restantes, rotulo).to.be.greaterThan(0);
      clique();
      cy.wait(250);
      tentar(restantes - 1);
    });
  };
  tentar(6);
  cy.get(condicao).should("be.visible");
}

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
        cy.visit("/grade");
        cy.get("table").should("be.visible");
      });

      it("modais nao vazam do viewport", () => {
        cy.get("body").find("*").each(($el) => {
          const rect = $el[0].getBoundingClientRect();
          expect(rect.width).to.be.lessThan(width + 10);
        });
      });

      it("navegacao por teclado funciona - foco visivel", () => {
        // O botão de menu é md:hidden: acima de 768px o foco vai para a nav desktop.
        const seletor =
          width < 768
            ? "header button[aria-label='Abrir menu']"
            : "header nav[aria-label='Navegação principal'] a";
        cy.get(seletor).first().focus().should("be.focused");
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

    function abrirMenuMobile() {
      repetirAte(
        "#mobile-nav",
        () => cy.get("button[aria-label='Abrir menu']").click(),
        "tentativas de abrir o menu mobile"
      );
    }

    it("botao de menu abre e fecha corretamente", () => {
      cy.get("button[aria-label='Abrir menu']").should("be.visible");
      abrirMenuMobile();
      cy.get("button[aria-label='Fechar menu']").click();
      // O nav é desmontado ao fechar; "not.be.visible" falharia por elemento inexistente.
      cy.get("#mobile-nav").should("not.exist");
    });

    it("links do menu mobile tem aria-current quando ativos", () => {
      abrirMenuMobile();
      cy.get("#mobile-nav a[aria-current='page']").should("exist");
    });
  });

  describe("Modais", () => {
    beforeEach(() => {
      cy.viewport(1024, 768);
      cy.visit("/grade");
    });

    function abrirNovoAgendamento() {
      repetirAte(
        "[role='dialog']",
        () => cy.contains("button", "Novo agendamento").click(),
        "tentativas de abrir o modal de novo agendamento"
      );
    }

    it("botao Novo agendamento abre modal responsivo", () => {
      abrirNovoAgendamento();
    });

    it("botao fechar fecha o modal", () => {
      abrirNovoAgendamento();
      cy.get("button[aria-label='Fechar']").click();
      cy.get("[role='dialog']").should("not.exist");
    });
  });
});