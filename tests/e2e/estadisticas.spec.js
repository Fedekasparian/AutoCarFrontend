// Estadísticas del admin: pestañas, período (queda en la URL), embudo de recomendaciones con "compró = pagó la
// inspección" y la fórmula de "para vos" en Parámetros. Solo lee: puede correr también contra producción.
//
// Variables: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (alguien con metricas.ver y parametros.editar; sin ellas se saltea)
import { test, expect } from '@playwright/test';
import { pagina } from './entorno.js';

const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };

test('el admin recorre las estadísticas y ve la fórmula de para vos', async ({ page }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD.');
    test.setTimeout(120_000); // Render puede estar dormido

    await page.goto(pagina('pages/auth/login.html'));
    await page.fill('#email', ADMIN.email);
    await page.fill('#password', ADMIN.password);
    await page.click('#form-login button[type="submit"]');
    await expect(page).not.toHaveURL(/login\.html/);

    await test.step('el resumen muestra los indicadores y aclara qué es "compró"', async () => {
        await page.goto(pagina('pages/admin/admin-metricas.html'));
        await expect(page.locator('#p-resumen')).toBeVisible({ timeout: 60_000 });
        await expect(page.locator('#kpis > li')).toHaveCount(5);
        await expect(page.locator('#p-resumen')).toContainText('pagó la inspección');
        await expect(page.locator('#p-plata')).toBeHidden();
    });

    await test.step('la pestaña Recomendaciones tiene el embudo y la tabla por origen', async () => {
        await page.getByRole('button', { name: 'Recomendaciones' }).click();
        await expect(page).toHaveURL(/#embudo$/);
        await expect(page.locator('#p-embudo')).toBeVisible();
        await expect(page.locator('#p-resumen')).toBeHidden();
        await expect(page.locator('#embudo-total > li')).toHaveCount(4);
        await expect(page.locator('#tabla-embudo tbody tr')).toHaveCount(4);
    });

    await test.step('el período cambia y queda en la URL', async () => {
        await page.getByRole('button', { name: '3 meses' }).click();
        await expect(page).toHaveURL(/dias=90#embudo$/);
        await expect(page.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: 'Plata' }).click();
        await expect(page.locator('#grafico-plata')).not.toBeEmpty();
        // Al recargar sigue en la misma pestaña y período
        await page.reload();
        await expect(page.locator('#p-plata')).toBeVisible({ timeout: 60_000 });
        await expect(page.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true');
    });

    await test.step('en Parámetros, la fórmula de para vos es una grilla de 4 perfiles por 4 criterios', async () => {
        await page.goto(pagina('pages/admin/admin-parametros.html'));
        await expect(page.locator('.formula__tabla tbody tr')).toHaveCount(4, { timeout: 60_000 });
        await expect(page.locator('.formula__peso')).toHaveCount(16);
        await expect(page.locator('#peso_familia_km')).toHaveAttribute('max', '5');
    });
});
