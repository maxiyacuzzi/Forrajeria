export {}

describe("Reportes", () => {
  beforeEach(() => {
    cy.login()
  })

  it("muestra las tarjetas de resumen y permite cambiar el rango", () => {
    cy.visit("/reportes")
    cy.contains("h1", "Reportes").should("be.visible")
    cy.contains("Total vendido").should("be.visible")
    cy.contains("Total gastado").should("be.visible")
    cy.contains("Balance").should("be.visible")
    cy.contains("Deuda a proveedores").should("be.visible")

    cy.contains("a", "Este mes").click()
    cy.location("search").should("contain", "range=")
  })

  it("un gasto con proveedor y saldo pendiente aparece en Deudas a proveedores", () => {
    const supplierName = `Proveedor Reportes Cy ${Date.now()}`
    const description = `Gasto Reportes Cy ${Date.now()}`

    cy.visit("/proveedores/nuevo")
    cy.get('input[name="name"]').type(supplierName)
    cy.contains("button", "Crear proveedor").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/proveedores")

    cy.visit("/gastos")
    cy.contains("button", "Nuevo gasto").click()
    cy.get('[role="dialog"] input[placeholder="Flete, luz, insumos..."]').type(description)
    cy.contains('[role="dialog"] [role="combobox"]', "Sin proveedor (opcional)").click()
    cy.contains("[role='option']", supplierName).click({ force: true })
    cy.get('[role="dialog"] input[type="number"]').first().setNumberValue(2000)
    cy.contains('[role="dialog"] button', "Nada").click()
    cy.contains('[role="dialog"] button', "Registrar gasto").click()

    cy.location("pathname", { timeout: 15000 }).should("eq", "/gastos")
    cy.contains("tr", description).should("contain", "Pendiente")

    cy.visit("/reportes")
    // With enough accumulated report data this heading can sit below the fold of
    // the (now internally-scrolling) main panel — assert it exists, not that it's
    // currently scrolled into view.
    cy.contains("h2", "Deudas a proveedores").should("exist")
    cy.contains("tr", supplierName).should("contain", "$2.000,00")
    cy.contains("tr", supplierName).click()
    cy.location("pathname", { timeout: 15000 }).should("match", /\/proveedores\/[0-9a-f-]+$/)
  })
})
