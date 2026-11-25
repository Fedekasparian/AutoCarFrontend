// Pruebas E2E de los ABM, una por flujo, cada una con su video (videos-abm/<nombre>.webm).
//   npx playwright test -c playwright.abm.config.js                 → todas, contra BASE_URL (por defecto producción)
//   npx playwright test -c playwright.abm.config.js -g "05-"        → una sola
// Van en orden (01 crea la concesionaria que usa 02) y en un solo navegador: cada video es una sola pestaña.
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = (process.env.BASE_URL || 'https://autocar-zeta.vercel.app').replace(/\/$/, '');

export default defineConfig({
    testDir: 'tests/e2e/abm',
    outputDir: 'test-results/abm',
    timeout: 300_000,
    expect: { timeout: 30_000 },
    retries: 0,
    workers: 1,
    fullyParallel: false,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-abm' }]],
    use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
        locale: 'es-AR',
        viewport: { width: 1366, height: 768 },
        video: { mode: 'on', size: { width: 1366, height: 768 } },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        // Más lento que una prueba común, para que en el video se vea cada paso
        launchOptions: { slowMo: Number(process.env.SLOWMO ?? 350) },
    },
    projects: [{ name: 'chromium' }],
});
