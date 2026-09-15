export {}

describe("Fidelidad", () => {
  beforeEach(() => {
    cy.login()
  })

  it("ajustar la racha de un cliente desde su ficha la refleja en /fidelidad", () => {
    const productName = `Producto Fidelidad Cy ${Date.now()}`
    const customerName = `Cliente Fidelidad Cy ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(productName)
    cy.get('input[name="cost_price"]').type("{selectall}1000")
    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")

    cy.visit("/clientes/nuevo")
    cy.get('input[name="name"]').type(customerName)
    cy.contains("button", "Crear cliente").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/clientes")

    cy.contains("tr", customerName).click()
    cy.location("pathname", { timeout: 15000 }).should("match", /\/clientes\/[0-9a-f-]+$/)

    cy.contains("Todavía no compró ningún producto").should("be.visible")
    cy.contains("button", "+ Agregar producto").click()
    cy.contains('[role="dialog"] [role="combobox"]', "Elegí un producto").click()
    cy.contains("[role='option']", productName).click({ force: true })
    cy.get('[role="dialog"] input[type="number"]').setNumberValue(3)
    cy.contains('[role="dialog"] button', "Guardar").click()

    cy.contains("Todavía no compró ningún producto").should("not.exist")
    cy.contains(productName).should("be.visible")

    cy.visit("/fidelidad")
    cy.contains("tr", customerName).should("contain", productName)
  })
})
