import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', timeout: 30_000, use: { baseURL: 'http://127.0.0.1:4317', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4317 --strictPort", port: 4317, reuseExistingServer: false },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
});
