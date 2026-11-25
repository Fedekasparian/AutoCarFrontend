// ABM de búsquedas guardadas del metabuscador (Mateo Ríos, comprador): crea una búsqueda, la ve en Mis búsquedas
// y la borra.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, confirmarEnHoja } from './comun.js';

test('10-comprador-abm-busquedas · crear una búsqueda guardada y borrarla', async ({ page }) => {
    let id;

    await paso(page, 'Comprador: Mateo Ríos ingresa', () => ingresar(page, USUARIOS.comprador));

    await paso(page, 'ALTA · guarda una búsqueda: Toyota Corolla desde 2018', async () => {
        await page.goto(pagina('pages/operaciones/meta-busqueda-nueva.html'));
        await expect(page.locator('#marca option')).not.toHaveCount(1, { timeout: 60_000 });
        await page.selectOption('#marca', { label: 'Toyota' });
        await expect(page.locator('#modelo option')).not.toHaveCount(1);
        await page.selectOption('#modelo', { label: 'Corolla' });
        await page.fill('#anio_desde', '2018');
        await page.waitForTimeout(800);
        await page.click('#form-busqueda button[type="submit"]');
        await expect(page).toHaveURL(/meta-busqueda-resultados\.html\?id=\d+/, { timeout: 90_000 });
        id = new URL(page.url()).searchParams.get('id');
        await expect(page.locator('#filtros').or(page.locator('#estado .aviso'))).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(1500);
    });

    const enLaLista = () => page.locator(`a[href*="meta-busqueda-resultados.html?id=${id}"]`);
    await paso(page, 'La búsqueda aparece en Mis búsquedas', async () => {
        await page.goto(pagina('pages/operaciones/meta-busqueda.html'));
        await expect(enLaLista().first()).toBeVisible({ timeout: 60_000 });
        await enLaLista().first().scrollIntoViewIfNeeded();
    });

    await paso(page, 'BAJA · la borra', async () => {
        await enLaLista().first().click();
        const borrar = page.locator('#borrar');
        await expect(borrar).toBeVisible({ timeout: 90_000 });
        await borrar.scrollIntoViewIfNeeded();
        await borrar.click();
        await confirmarEnHoja(page, 'Borrar');
        await expect(page).toHaveURL(/meta-busqueda\.html\?borrada=1/);
        await expect(enLaLista()).toHaveCount(0);
        await page.waitForTimeout(1000);
        await salir(page);
    });
});
