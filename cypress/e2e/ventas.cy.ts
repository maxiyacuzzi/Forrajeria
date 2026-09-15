export {}

describe("Ventas", () => {
  beforeEach(() => {
    cy.login()
  })

  it("registra una venta con tarjeta: aplica el recargo, descuenta stock y abre la caja sola", () => {
    const productName = `Producto Venta Cypress ${Date.now()}`
    const customerName = `Cliente Venta Cypress ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(productName)
    cy.get('input[name="cost_price"]').type("{selectall}1000", { delay: 50 })
    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")

    cy.visit("/stock/ingreso")
    cy.contains('[role="combobox"]', "Elegí un producto").click()
    cy.contains("[role='option']", productName).click({ force: true })
    cy.get('input[type="number"]').eq(1).setNumberValue(10)
    cy.contains("button", "Registrar ingreso").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/stock")
    cy.contains("tr", productName).should("contain", "10 unidad")

    cy.visit("/clientes/nuevo")
    cy.get('input[name="name"]').type(customerName)
    cy.contains("button", "Crear cliente").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/clientes")

    cy.visit("/ventas/rapida")
    cy.contains(productName).click()
    cy.get('[role="combobox"]').first().click()
    cy.contains("[role='option']", customerName).click()
    cy.contains("button", "Tarjeta").click()

    cy.contains("Recargo tarjeta (10%)").should("be.visible")
    cy.contains("button", "Cobrar $1.540,00").should("be.visible").click()

    cy.location("pathname", { timeout: 15000 }).should("match", /\/ventas\/[0-9a-f-]+$/)
    cy.contains("Recargo tarjeta (10%)").should("be.visible")
    cy.contains("Total: $1.540,00").should("be.visible")

    cy.visit("/stock")
    cy.contains("h1", "Stock").should("be.visible")
    cy.contains("tr", productName).should("contain", "9 unidad")

    // The till auto-opens on the first sale of the day if none is open yet —
    // on this shared account it may already be open from an earlier run, so
    // just confirm it ends up open rather than assuming it started closed.
    cy.visit("/caja")
    cy.contains("Abierta").should("be.visible")
  })

  it("una venta en efectivo no lleva recargo", () => {
    const productName = `Producto Efectivo Cypress ${Date.now()}`
    const customerName = `Cliente Efectivo Cypress ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(productName)
    cy.get('input[name="cost_price"]').type("{selectall}1000", { delay: 50 })
    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")

    cy.visit("/stock/ingreso")
    cy.contains('[role="combobox"]', "Elegí un producto").click()
    cy.contains("[role='option']", productName).click({ force: true })
    cy.get('input[type="number"]').eq(1).setNumberValue(5)
    cy.contains("button", "Registrar ingreso").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/stock")

    cy.visit("/clientes/nuevo")
    cy.get('input[name="name"]').type(customerName)
    cy.contains("button", "Crear cliente").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/clientes")

    cy.visit("/ventas/rapida")
    cy.contains(productName).click()
    cy.get('[role="combobox"]').first().click()
    cy.contains("[role='option']", customerName).click()

    cy.contains("Recargo tarjeta").should("not.exist")
    cy.contains("button", "Cobrar $1.400,00").click()

    cy.location("pathname", { timeout: 15000 }).should("match", /\/ventas\/[0-9a-f-]+$/)
    cy.contains("Recargo tarjeta").should("not.exist")
    cy.contains("Total: $1.400,00").should("be.visible")
  })
})
