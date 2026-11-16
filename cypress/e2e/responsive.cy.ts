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
        if (width < 768) {
          cy.get("[data-testid='mobile-schedule']").should("be.visible");
          cy.get("[data-testid='mobile-day-card']").should("have.length", 5);
          cy.get("[data-testid='mobile-slot']").should("have.length.at.least", 5);
          cy.get("[data-testid='desktop-table-container']").should("not.be.visible");
          cy.get("[data-testid='mobile-day-card']").each(($card) => {
            expect($card[0].getBoundingClientRect().width).to.be.at.most(width + 1);
          });
        } else {
          cy.get("table").should("be.visible");
          cy.get("[data-testid='desktop-table-container']").then(($wrapper) => {
            expect($wrapper[0].getBoundingClientRect().width).to.be.at.most(width + 1);
          });
          cy.get("[data-testid='mobile-schedule']").should("not.be.visible");
        }
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

  describe("Grade mobile", () => {
    beforeEach(() => {
      cy.viewport(320, 568);
      cy.visit("/grade");
    });

    it("destaca o dia atual quando ele esta na semana exibida", () => {
      cy.get("[data-testid='mobile-day-card']").then(($days) => {
        const todayCard = [...$days].find((day) => day.querySelector("button[aria-expanded]")?.textContent?.includes("Hoje"));
        if (todayCard) {
          cy.wrap(todayCard).should("have.class", "border-primary");
        }
      });
    });

    it("abre as acoes do agendamento ao tocar em um horario ocupado", () => {
      cy.get("[data-testid='mobile-day-card']").then(($cards) => {
        const cardWithBooking = [...$cards].find((card) =>
          card.querySelector("button[aria-label^='Ver ações']")
        );
        if (!cardWithBooking) return;
        cy.wrap(cardWithBooking).find("button[aria-expanded]").then(($toggle) => {
          if ($toggle.attr("aria-expanded") === "false") cy.wrap($toggle).click();
        });
        cy.wrap(cardWithBooking)
          .find("[data-testid='mobile-slot'] button[aria-label^='Ver ações']")
          .first()
          .click();
        cy.contains("Ações do agendamento").should("be.visible");
        cy.contains("button", "Editar agendamento").should("be.visible");
        cy.contains("button", "Cancelar agendamento").should("be.visible");
      });
    });

    it("mantem somente hoje expandido inicialmente e mostra a disponibilidade", () => {
      cy.get("[data-testid='mobile-day-card']").should("have.length", 5).each(($card) => {
        cy.wrap($card).find("button[aria-expanded]").should(($button) => {
          const isToday = $button.text().includes("Hoje");
          expect($button.attr("aria-expanded")).to.equal(isToday ? "true" : "false");
          expect($button.text()).to.match(/\d+\/\d+ livres/);
        });
      });
    });

    it("expande e recolhe dias independentemente", () => {
      cy.get("[data-testid='mobile-day-card']").eq(1).within(() => {
        cy.get("button[aria-expanded='false']").click().should("have.attr", "aria-expanded", "true");
        cy.get("[data-testid='mobile-slot']").should("have.length.at.least", 1);
        cy.get("button[aria-expanded='true']").click().should("have.attr", "aria-expanded", "false");
        cy.get("[data-testid='mobile-slot']").should("not.be.visible");
      });
    });

    it("permite expandir um dia pelo teclado", () => {
      cy.get("[data-testid='mobile-day-card']").eq(1).find("button[aria-expanded='false']")
        .focus()
        .type("{enter}")
        .should("have.attr", "aria-expanded", "true");
    });

    it("mantem nome e secretaria truncados em linhas individuais", () => {
      cy.get("[data-testid='mobile-day-card'] [aria-expanded='true']")
        .closest("article")
        .find("[data-testid='mobile-slot']")
        .then(($slots) => {
          const bookingSlot = [...$slots].find((slot) => slot.querySelector("[title]"));
          if (!bookingSlot) return;
          cy.wrap(bookingSlot).find("[title]").should("have.length.at.least", 2).each(($text) => {
            expect($text.attr("title")).to.be.a("string").and.not.be.empty;
            expect($text).to.have.class("truncate");
          });
        });
    });
  });

  describe("Truncamento desktop", () => {
    beforeEach(() => {
      cy.viewport(1024, 768);
      cy.visit("/grade");
    });

    it("mantem textos de agendamentos em uma linha com tooltip", () => {
      cy.get("table").should("be.visible");
      cy.get("table [title]").then(($texts) => {
        if (!$texts.length) return;
        cy.wrap($texts).each(($text) => {
          expect($text.attr("title")).to.be.a("string").and.not.be.empty;
          expect($text).to.have.class("truncate");
        });
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
