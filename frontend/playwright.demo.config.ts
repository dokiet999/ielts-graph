import { defineConfig, devices } from '@playwright/test'

// Same app, started in demo mode on its own port (mock API + HTTP Basic credentials).
export default defineConfig({
  testDir: './e2e',
  testMatch: 'demo.spec.ts',
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_DEMO_USER: 'student_enrolled',
      VITE_DEMO_PASSWORD: 'Demo@123',
      VITE_DEMO_FULLNAME: 'Enrolled Student',
    },
  },
})
