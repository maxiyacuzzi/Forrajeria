export {}

describe("Clientes", () => {
  beforeEach(() => {
    cy.login()
  })

  it("crea un cliente sin DNI y sin whatsapp", () => {
    const name = `Cliente Cypress ${Date.now()}`

    cy.visit("/clientes/nuevo")
    cy.get('input[name="name"]').type(name)
    cy.contains("button", "Crear cliente").click()

    cy.location("pathname", { timeout: 15000 }).should("eq", "/clientes")
    cy.contains("tr", name).should("contain", "Sin WhatsApp")
  })

  it("un click en la fila abre la ficha del cliente para editar", () => {
    const name = `Cliente Row Cypress ${Date.now()}`

    cy.visit("/clientes/nuevo")
    cy.get('input[name="name"]').type(name)
    cy.contains("button", "Crear cliente").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/clientes")

    cy.contains("tr", name).click()
    cy.location("pathname", { timeout: 15000 }).should("match", /\/clientes\/[0-9a-f-]+$/)
    cy.get('input[name="name"]').should("have.value", name)
  })

  it("un cliente con whatsapp muestra el botón para enviar mensaje", () => {
    const name = `Cliente Wa Cypress ${Date.now()}`

    cy.visit("/clientes/nuevo")
    cy.get('input[name="name"]').type(name)
    cy.get('input[name="whatsapp"]').type("+54 9 11 5555-1234")
    cy.contains("button", "Crear cliente").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/clientes")

    cy.contains("tr", name).contains("a", "Enviar WhatsApp").should(
      "have.attr",
      "href"
    ).and("include", "wa.me")
  })
})
