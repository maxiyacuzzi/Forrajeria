export {}

describe("Gastos", () => {
  beforeEach(() => {
    cy.login()
  })

  it("registra un gasto pagado por completo y queda marcado como Pagado", () => {
    const description = `Gasto Cypress ${Date.now()}`

    cy.visit("/gastos")
    cy.contains("button", "Nuevo gasto").click()
    cy.get('[role="dialog"] input[placeholder="Flete, luz, insumos..."]').type(description)
    cy.get('[role="dialog"] input[type="number"]').first().setNumberValue(5000)
    cy.contains('[role="dialog"] button', "Todo").click()
    cy.contains('[role="dialog"] button', "Registrar gasto").click()

    cy.location("pathname", { timeout: 15000 }).should("eq", "/gastos")
    cy.contains("tr", description).should("contain", "Pagado")
    cy.contains("tr", description).should("contain", "$5.000,00")
  })

  it("registra un gasto parcialmente pagado y queda marcado como Pendiente", () => {
    const description = `Gasto Parcial Cypress ${Date.now()}`

    cy.visit("/gastos")
    cy.contains("button", "Nuevo gasto").click()
    cy.get('[role="dialog"] input[placeholder="Flete, luz, insumos..."]').type(description)
    cy.get('[role="dialog"] input[type="number"]').first().setNumberValue(5000)
    cy.contains('[role="dialog"] button', "Nada").click()
    cy.contains('[role="dialog"] button', "Registrar gasto").click()

    cy.location("pathname", { timeout: 15000 }).should("eq", "/gastos")
    cy.contains("tr", description).should("contain", "Pendiente")
  })
})
