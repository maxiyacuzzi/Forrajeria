export {}

describe("Inicio (dashboard)", () => {
  beforeEach(() => {
    cy.login()
  })

  it("muestra las tarjetas de resumen y un producto recién creado con stock bajo del mínimo", () => {
    const productName = `Producto Dashboard Cy ${Date.now()}`

    cy.visit("/")
    cy.contains("h1", "Inicio").should("be.visible")
    cy.contains("Ventas hoy").should("be.visible")
    cy.contains("Ventas del mes").should("be.visible")
    cy.contains("Stock bajo").should("be.visible")
    cy.contains("Clientes con premio").should("be.visible")

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(productName)
    cy.get('input[name="cost_price"]').type("{selectall}1000")
    cy.get('input[name="min_stock_alert"]').type("{selectall}5")
    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")

    cy.visit("/")
    cy.contains("h2", "Productos con stock bajo").should("be.visible")
    // The shared test account accumulates low-stock products across every Cypress
    // run, so a freshly created row isn't guaranteed to land inside the current
    // scroll of the (now internally-scrolling) main panel — assert it exists, then
    // let .click()'s actionability check scroll it into view.
    cy.contains("tr", productName).should("exist")
    cy.contains("tr", productName).click()
    cy.location("pathname", { timeout: 15000 }).should("match", /\/productos\/[0-9a-f-]+$/)
    cy.get('input[name="name"]').should("have.value", productName)
  })
})
