export {}

describe("Productos", () => {
  beforeEach(() => {
    cy.login()
  })

  it("crea un producto simple", () => {
    const name = `Collar Cypress ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(name)
    cy.get('input[name="cost_price"]').type("{selectall}1000", { delay: 50 })
    cy.contains("button", "Crear producto").click()

    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")
    // The shared test account accumulates products across every Cypress run, so a
    // freshly created row isn't guaranteed to land inside the current scroll of the
    // (now internally-scrolling) main panel — assert it exists, not that it's
    // currently scrolled into view.
    cy.contains(name).should("exist")
  })

  it("crea un producto fraccionable con precio por envase y por kg", () => {
    const name = `Alimento Cypress ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(name)
    cy.get('[role="combobox"]').eq(1).click()
    cy.contains("[role='option']", /^Fraccionable$/).click()
    cy.get('input[name="conversion_factor"]').type("20")
    cy.get('input[name="cost_price"]').type("{selectall}10000", { delay: 50 })
    cy.contains("Precio envase entero").should("be.visible")

    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")
    cy.contains("tr", name).should("contain", "/ envase")
  })

  it("no_fraccionable usa los mismos campos que fraccionable (envase, kg, márgenes)", () => {
    const name = `Fardo Cypress ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(name)
    cy.get('[role="combobox"]').eq(1).click()
    cy.contains("[role='option']", /^No fraccionable$/).click()

    cy.contains("label", "Envase").should("be.visible")
    cy.contains("label", "Kg por envase").should("be.visible")
    cy.contains("label", "Margen suelto (%)").should("be.visible")
    cy.contains("label", "Peso de referencia").should("not.exist")
    cy.contains("label", "Unidad de compra").should("not.exist")

    cy.get('input[name="conversion_factor"]').type("22")
    cy.get('input[name="cost_price"]').type("{selectall}7122.5", { delay: 50 })

    cy.contains("p", "Precio envase entero").should("contain", "9.700,00")
    cy.contains("p", "Precio por kg suelto").should("contain", "600,00")

    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")
    cy.contains(name).should("exist")
  })
})
