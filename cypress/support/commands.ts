/// <reference types="cypress" />

// A fixed, already-provisioned Stage account — tests log into it instead of
// signing up fresh each run. Supabase's auth email sending is rate limited,
// so repeated real signups (one per test, or even one per spec file) burn
// through that quota fast across a whole suite.
//
// Credentials come from Cypress env vars, never hardcoded here (this file is
// committed to git): set them in cypress.env.json (gitignored) for local
// runs, and as CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD repo secrets for
// CI (see .github/workflows/cypress.yml).

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Logs into the shared Stage test account and lands on the dashboard. */
      login(): Chainable<void>
      /**
       * Sets a controlled numeric input's value via the native property
       * setter instead of simulated keystrokes. Cypress's `.type()` can
       * outrun React's reconciliation on multi-digit values in some
       * react-hook-form-controlled fields — the DOM's `.value` settles
       * correctly, but the form's internal state can still submit a stale
       * single-digit value. This sidesteps that race entirely.
       */
      setNumberValue(value: number | string): Chainable<JQuery<HTMLElement>>
    }
  }
}

Cypress.Commands.add("login", () => {
  const email = Cypress.env("TEST_EMAIL")
  const password = Cypress.env("TEST_PASSWORD")
  if (!email || !password) {
    throw new Error(
      "Missing TEST_EMAIL / TEST_PASSWORD Cypress env vars. Add them to cypress.env.json locally, " +
        "or as CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD repo secrets in CI."
    )
  }

  cy.session("fixed-test-user", () => {
    cy.visit("/login")
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)
    cy.contains("button", "Ingresar").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/")
  })

  cy.visit("/")
})

Cypress.Commands.add(
  "setNumberValue",
  { prevSubject: "element" },
  (subject, value) => {
    const input = subject[0] as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
    setter.call(input, String(value))
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
    input.dispatchEvent(new Event("blur", { bubbles: true }))
    return cy.wrap(subject)
  }
)

export {}
