// eslint-disable-next-line @typescript-eslint/no-explicit-any
Cypress.Commands.add("checkA11y", () => {
  cy.injectAxe();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cy.checkA11y(null as any, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa"],
    },
  } as any);
});