/* eslint-disable @typescript-eslint/no-explicit-any -- a tipagem de `cy.checkA11y`
   no cypress-axe é estreita demais para os argumentos usados aqui. */
Cypress.Commands.add("checkA11y", () => {
  cy.injectAxe();
  cy.checkA11y(null as any, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa"],
    },
  } as any);
});
