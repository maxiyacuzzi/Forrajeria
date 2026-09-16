import { defineConfig } from "cypress"
import mochawesomePlugin from "cypress-mochawesome-reporter/plugin"

export default defineConfig({
  reporter: "cypress-mochawesome-reporter",
  reporterOptions: {
    reportDir: "cypress/reports",
    reportPageTitle: "Forrajeria — Cypress",
    embeddedScreenshots: true,
    inlineAssets: true,
    charts: true,
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1440,
    viewportHeight: 900,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    setupNodeEvents(on) {
      mochawesomePlugin(on)
    },
  },
})
