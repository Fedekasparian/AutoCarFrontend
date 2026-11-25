// ABM de favoritos (Mateo Ríos, comprador): guarda un auto en favoritos desde su ficha, lo ve en Favoritos y
// lo saca desde ahí. Elige un auto publicado que todavía no tenga guardado, así no le cambia sus favoritos.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, apiComo } from './comun.js';

test('09-comprador-abm-favoritos · guardar un auto en favoritos y sacarlo', async ({ page, baseURL }) => {
    const yo = await apiComo(baseURL, USUARIOS.comprador);
    const guardados = new Set(((await yo.get('/api/favoritos')).items ?? []).map((v) => v.id));
    const auto = ((await yo.get('/api/vehiculos?per_page=40')).items ?? []).find((v) => !guardados.has(v.id));
    await yo.cerrar();
    test.skip(!auto, 'No hay autos publicados que no estén ya en favoritos.');
    const titulo = `${auto.marca} ${auto.modelo} ${auto.anio}`;

    await paso(page, 'Comprador: Mateo Ríos ingresa', () => ingresar(page, USUARIOS.comprador));

    await paso(page, `ALTA · guarda el ${titulo} en favoritos`, async () => {
        await page.goto(pagina(`pages/vehiculos/vehiculo.html?id=${auto.id}`));
        const boton = page.locator('#vehiculo-favorito');
        await expect(boton).toHaveText('Guardar en favoritos', { timeout: 60_000 });
        await boton.scrollIntoViewIfNeeded();
        await boton.click();
        await expect(boton).toHaveText('Guardado en favoritos');
    });

    const corazon = page.locator(`button[data-favorito="${auto.id}"]`);
    await paso(page, 'Lo ve en Mis favoritos', async () => {
        await page.goto(pagina('pages/vehiculos/favoritos.html'));
        await expect(corazon).toHaveAttribute('aria-pressed', 'true', { timeout: 60_000 });
        await corazon.scrollIntoViewIfNeeded();
    });

    await paso(page, 'BAJA · lo saca de favoritos', async () => {
        await corazon.click();
        await expect(corazon).toHaveCount(0);
        await page.reload();
        await expect(page.locator(`button[data-favorito="${auto.id}"]`)).toHaveCount(0, { timeout: 30_000 });
        await page.waitForTimeout(1000);
        await salir(page);
    });
});
