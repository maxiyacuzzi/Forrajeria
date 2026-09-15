export {}

describe("Caja", () => {
  beforeEach(() => {
    cy.login()
  })

  it("permite cerrar la caja (abriéndola primero si hace falta) y el cierre queda en el historial", () => {
    cy.visit("/caja")

    // On this shared account the till may already be open from another
    // test/run — open one only if it's currently closed.
    cy.get("body").then(($body) => {
      if ($body.text().includes("No hay ninguna caja abierta")) {
        cy.contains("button", "Abrir caja").click()
        cy.get('[role="dialog"] input[type="number"]').first().setNumberValue(1000)
        cy.contains('[role="dialog"] button', "Abrir caja").click()
        cy.contains("Abierta", { timeout: 15000 }).should("be.visible")
      }
    })

    cy.contains("Abierta").should("be.visible")
    cy.contains("button", "Cerrar caja").click()
    cy.get('[role="dialog"] input[type="number"]').first().setNumberValue(500)
    cy.contains('[role="dialog"] button', "Cerrar caja").click()

    cy.contains("No hay ninguna caja abierta", { timeout: 15000 }).should("be.visible")
    cy.contains("h2", "Historial de cierres").should("be.visible")
    cy.get("table").last().find("tbody tr").first().should("contain", "$500,00")
  })
})
