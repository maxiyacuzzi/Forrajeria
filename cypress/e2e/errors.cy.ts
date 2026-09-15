export {}

// Almost all data fetching and mutations in this app run through Next.js
// Server Actions / Server Components — network calls the browser never
// sees, so cy.intercept() can't touch them. The one exception is image
// upload (src/components/image-upload.tsx), which calls Supabase Storage
// directly from the browser — a real network request we can force to fail
// and use to verify the UI degrades gracefully instead of hanging or
// crashing.
describe("Manejo de errores (cy.intercept)", () => {
  beforeEach(() => {
    cy.login()
  })

  it("si Supabase Storage devuelve 500 al subir una imagen, se muestra un error y el botón se recupera", () => {
    cy.intercept("POST", "**/storage/v1/object/**", {
      statusCode: 500,
      body: { message: "Simulated storage failure" },
    }).as("uploadFail")

    cy.visit("/productos/nuevo")
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from("fake-image-content"),
        fileName: "producto.png",
        mimeType: "image/png",
      },
      { force: true }
    )

    cy.wait("@uploadFail")
    cy.contains("Simulated storage failure").should("be.visible")
    cy.contains("button", "Subir foto").should("be.visible").and("not.be.disabled")
  })

  it("si la subida de imagen falla por corte de red, el formulario sigue siendo usable", () => {
    cy.intercept("POST", "**/storage/v1/object/**", { forceNetworkError: true }).as("uploadNetworkFail")

    cy.visit("/productos/nuevo")
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from("fake-image-content"),
        fileName: "producto.png",
        mimeType: "image/png",
      },
      { force: true }
    )

    cy.wait("@uploadNetworkFail")
    cy.contains("button", "Subir foto").should("be.visible").and("not.be.disabled")

    const productName = `Producto Sin Imagen Cy ${Date.now()}`
    cy.get('input[name="name"]').type(productName)
    cy.get('input[name="cost_price"]').type("{selectall}1000")
    cy.contains("button", "Crear producto").click()
    cy.location("pathname", { timeout: 15000 }).should("eq", "/productos")
    cy.contains("tr", productName).should("be.visible")
  })
})
