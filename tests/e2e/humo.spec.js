// @humo: solo lectura. Es lo único que corre contra producción después de cada deploy a main.
import { test, expect } from '@playwright/test';
import { pagina } from './entorno.js';

test.describe('@humo', () => {
    test('la portada carga', async ({ page }) => {
        const respuesta = await page.goto(pagina('index.html'));
        expect(respuesta.status()).toBe(200);
        await expect(page).toHaveTitle(/AutoCar/i);
    });

    test('el proxy /api llega al back del entorno', async ({ request }) => {
        const respuesta = await request.get('/api/marcas');
        expect(respuesta.status(), 'Si da 503, falta BACKEND_URL en Vercel para este entorno').toBe(200);
        expect(respuesta.headers()['content-type']).toContain('application/json');
    });

    // Solo en Vercel: localmente la raíz la sirve el servidor estático, sin las redirecciones de vercel.json.
    test('la raíz del sitio lleva a la portada', async ({ page }) => {
        test.skip(!/vercel\.app/.test(process.env.BASE_URL || ''), 'La redirección es de vercel.json');
        await page.goto('/');
        await expect(page).toHaveURL(/\/front\/$/);
        await expect(page).toHaveTitle(/AutoCar/i);
    });

    test('el listado de vehículos se muestra', async ({ page }) => {
        await page.goto(pagina('pages/vehiculos/buscar.html'));
        // Con o sin resultados, el total se completa cuando responde la API.
        await expect(page.locator('#resultados-total')).not.toBeEmpty();
    });

    // Los números de "Cómo funciona" salen de los parámetros (GET /api/parametros), no están fijos en la página
    test('cómo funciona muestra los números de los parámetros', async ({ page }) => {
        const p = await (await page.request.get('/api/parametros')).json();
        await page.goto(pagina('pages/info/como-funciona.html'));
        const dias = page.locator('#comprar [data-parametro="dias_reclamo"]');
        await expect(dias).toHaveText(String(p.dias_reclamo));
        await expect(page.locator('#mecanicos [data-parametro="comision_autocar"]')).toHaveText(String(p.comision_autocar));
    });
});
