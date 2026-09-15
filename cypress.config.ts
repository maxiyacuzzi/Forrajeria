import { defineConfig } from "cypress"

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1440,
    viewportHeight: 900,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    setupNodeEvents() {
      // no custom node events needed yet
    },
  },
})
