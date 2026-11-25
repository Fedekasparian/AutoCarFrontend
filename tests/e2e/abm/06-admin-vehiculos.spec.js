// Baja de vehículos desde el panel (admin, vehiculos.gestionar): busca una publicación aprobada y la elimina
// (baja lógica). Nadie del panel da de alta ni edita autos: eso lo hace su dueño (ver 02 y 03).
// La publicación la carga la concesionaria y la aprueba la moderadora por la API, antes del video.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, confirmarEnHoja, apiComo, concesionaria, ahora } from './comun.js';

test('06-admin-baja-vehiculos · el admin busca un vehículo publicado y lo elimina', async ({ page, baseURL }) => {
    const empresa = concesionaria();
    test.skip(!empresa, 'Primero hay que correr 01 (crea la concesionaria).');
    const marca = `E2E${ahora()}`;
    const duenio = await apiComo(baseURL, empresa);
    const v = await duenio.publicar({ marca: 'Chevrolet', modelo: 'Onix', anio: 2019, version: `1.4 LT ${marca}`,
        kilometraje: 80000, precio: 13900000, descripcion: `Publicación de prueba ${marca}: la elimina el admin.` });
    const mod = await apiComo(baseURL, USUARIOS.moderador);
    expect((await mod.patch(`/api/admin/vehiculos/${v.id}/estado`, { estado: 'disponible' })).status()).toBe(200);
    await mod.cerrar();

    try {
        await paso(page, 'El Chevrolet Onix 2019 está publicado', async () => {
            await page.goto(pagina(`pages/vehiculos/vehiculo.html?id=${v.id}`));
            await expect(page.locator('main')).toContainText('Chevrolet Onix', { timeout: 60_000 });
            await page.waitForTimeout(1200);
        });

        await paso(page, 'Admin ingresa y busca el vehículo', async () => {
            await ingresar(page, USUARIOS.admin);
            await page.goto(pagina(`pages/admin/admin-vehiculos.html?q=${marca}`));
            await expect(page.locator('#resultados tr', { hasText: 'Onix' })).toBeVisible({ timeout: 60_000 });
        });

        await paso(page, 'BAJA · lo elimina', async () => {
            await page.locator('#resultados tr', { hasText: 'Onix' }).getByRole('button', { name: 'Eliminar' }).click();
            await confirmarEnHoja(page, 'Eliminar');
            await expect(page.locator('#aviso')).toContainText('Se eliminó');
        });

        await paso(page, 'Ya no se ve en el sitio', async () => {
            await page.goto(pagina(`pages/vehiculos/vehiculo.html?id=${v.id}`));
            await expect(page.locator('main')).toContainText('No encontramos ese vehículo', { timeout: 60_000 });
            await page.waitForTimeout(1200);
            await salir(page);
        });
    } finally {
        await duenio.del(`/api/mis-vehiculos/${v.id}`).catch(() => {});
        await duenio.cerrar();
    }
});
