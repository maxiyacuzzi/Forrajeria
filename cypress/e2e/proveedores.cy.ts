export {}

describe("Proveedores", () => {
  beforeEach(() => {
    cy.login()
  })

  it("crea un proveedor y lo edita haciendo click en la fila", () => {
    const name = `Proveedor Cypress ${Date.now()}`

    cy.visit("/proveedores/nuevo")
    cy.get('input[name="name"]').type(name)
    cy.contains("button", "Crear proveedor").click()

    cy.location("pathname", { timeout: 15000 }).should("eq", "/proveedores")
    cy.contains("tr", name).click()

    cy.location("pathname", { timeout: 15000 }).should("match", /\/proveedores\/[0-9a-f-]+$/)
    cy.get('input[name="name"]').should("have.value", name)
  })
})
