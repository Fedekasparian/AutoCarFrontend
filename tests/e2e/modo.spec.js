// Botón de modo claro / oscuro: sin elegir sigue al sistema; al tocarlo cambia, se acuerda al recargar y en celular
// no está en la barra (va en Cuenta). Solo lee: puede correr también contra producción.
import { test, expect } from '@playwright/test';
import { pagina } from './entorno.js';

test.describe('modo claro / oscuro', () => {
    test.use({ colorScheme: 'light', viewport: { width: 1280, height: 800 } });

    test('sigue al sistema, cambia con el botón y se acuerda', async ({ page }) => {
        await page.goto(pagina('index.html'));
        const raiz = page.locator('html');
        await expect(raiz).toHaveAttribute('data-modo', 'claro');
        const boton = page.locator('.marca-nav .boton-modo');
        await expect(boton).toHaveAttribute('aria-label', 'Pasar a modo oscuro');
        const fondoClaro = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

        await boton.click();
        await expect(raiz).toHaveAttribute('data-modo', 'oscuro');
        await expect(boton).toHaveAttribute('aria-label', 'Pasar a modo claro');
        expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(fondoClaro);

        await page.reload();
        await expect(raiz).toHaveAttribute('data-modo', 'oscuro');
    });
});

test.describe('celular con el sistema en oscuro', () => {
    test.use({ colorScheme: 'dark', viewport: { width: 390, height: 800 } });

    test('arranca en oscuro y el botón no ocupa la barra de pestañas', async ({ page }) => {
        await page.goto(pagina('index.html'));
        await expect(page.locator('html')).toHaveAttribute('data-modo', 'oscuro');
        await expect(page.locator('.barra .boton-modo')).toHaveCount(0); // la portada no tiene barra de pestañas
    });
});
