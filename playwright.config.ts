import { defineConfig, devices } from '@playwright/test';

// In sandboxes with a pre-installed browser set PW_CHROMIUM_PATH. On a normal machine run
// `npx playwright install chromium` once and leave the variable unset.
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 70_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
  },
  webServer: {
    command: 'npm run build && npx serve out -l 3100 --no-clipboard',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
