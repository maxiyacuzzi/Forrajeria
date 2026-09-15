export {}

describe("Stock", () => {
  beforeEach(() => {
    cy.login()
  })

  it("ajusta el stock de un producto desde la grilla y el movimiento queda en el historial", () => {
    const productName = `Producto Stock Cy ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(productName)
    cy.get('input[name="cost_price"]').type("{selectall}1000")
    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")

    cy.visit("/stock")
    cy.contains("h1", "Stock").should("be.visible")
    cy.contains("tr", productName).contains("button", "Ajustar").click()
    cy.get('[role="dialog"] input[type="number"]').first().setNumberValue(10)
    cy.get('[role="dialog"] input[placeholder="Motivo del ajuste"]').type("Carga inicial")
    cy.contains('[role="dialog"] button', "Registrar ajuste").click()

    cy.location("pathname", { timeout: 15000 }).should("eq", "/stock")
    cy.contains("tr", productName).should("contain", "10 unidad")

    cy.visit("/stock/movimientos")
    cy.contains("tr", productName).should("contain", "Ajuste manual")
    cy.contains("tr", productName).should("contain", "+10 unidad")
  })

  it("un click en la fila de stock lleva al producto (sin abrir el ajuste)", () => {
    const productName = `Producto StockRow Cy ${Date.now()}`

    cy.visit("/productos/nuevo")
    cy.get('input[name="name"]').type(productName)
    cy.get('input[name="cost_price"]').type("{selectall}1000")
    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")

    cy.visit("/stock")
    cy.contains("tr", productName).find("td").first().click()
    cy.location("pathname", { timeout: 15000 }).should("match", /\/productos\/[0-9a-f-]+$/)
    cy.get('input[name="name"]').should("have.value", productName)
  })
})
