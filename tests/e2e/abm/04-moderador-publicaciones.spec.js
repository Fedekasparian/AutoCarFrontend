// Moderación (Paula Correa, moderadora): aprueba una publicación, rechaza otra con motivo y da de baja una aprobada.
// Las dos publicaciones las carga antes la concesionaria por la API (no sale en el video) y al final se eliminan.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, apiComo, concesionaria, ahora } from './comun.js';

test('04-moderador-moderar-publicaciones · aprobar, rechazar y dar de baja publicaciones', async ({ page, baseURL }) => {
    const empresa = concesionaria();
    test.skip(!empresa, 'Primero hay que correr 01 (crea la concesionaria).');
    const duenio = await apiComo(baseURL, empresa);
    const a = await duenio.publicar({ marca: 'Peugeot', modelo: '208', anio: 2022, version: `1.6 Allure E2E-${ahora()}`,
        kilometraje: 21000, precio: 21500000, descripcion: 'Publicación de prueba E2E para moderar.' });
    const b = await duenio.publicar({ marca: 'Fiat', modelo: 'Cronos', anio: 2020, version: `1.3 Drive E2E-${ahora()}`,
        kilometraje: 64000, precio: 100000, descripcion: 'Precio mal cargado: prueba E2E para rechazar.' });
    const tarjeta = (id) => page.locator(`li.propuesta:has(#motivo-${id})`);

    try {
        await paso(page, 'Moderadora: Paula Correa ingresa', () => ingresar(page, USUARIOS.moderador));

        await paso(page, 'Cola de publicaciones pendientes', async () => {
            await page.goto(pagina('pages/admin/admin-moderar.html?estado=pendiente'));
            await expect(tarjeta(a.id)).toBeVisible({ timeout: 60_000 });
            await tarjeta(a.id).scrollIntoViewIfNeeded();
        });

        await paso(page, 'APROBAR · el Peugeot 208 está completo y bien cargado', async () => {
            await tarjeta(a.id).getByRole('button', { name: 'Aprobar' }).click();
            await expect(page.locator('.aviso-flotante')).toContainText('Se aprobó');
            await expect(tarjeta(a.id)).toHaveCount(0);
        });

        await paso(page, 'RECHAZAR · el Fiat Cronos tiene el precio mal cargado', async () => {
            await tarjeta(b.id).scrollIntoViewIfNeeded();
            await tarjeta(b.id).locator(`#motivo-${b.id}`).fill('El precio de $100.000 no es real: corregilo y volvé a enviarla.');
            await tarjeta(b.id).getByRole('button', { name: 'Rechazar' }).click();
            await expect(page.locator('.aviso-flotante')).toContainText('Se rechazó');
            await page.goto(pagina('pages/admin/admin-moderar.html?estado=rechazado'));
            await expect(page.locator('li.propuesta', { hasText: 'El precio de $100.000 no es real' }).first()).toBeVisible();
        });

        await paso(page, 'BAJA · da de baja el Peugeot 208 ya aprobado', async () => {
            await page.goto(pagina('pages/admin/admin-moderar.html?estado=disponible'));
            await expect(tarjeta(a.id)).toBeVisible({ timeout: 60_000 });
            await tarjeta(a.id).scrollIntoViewIfNeeded();
            await tarjeta(a.id).locator(`#motivo-${a.id}`).fill('Prueba de moderación: se da de baja.');
            await tarjeta(a.id).getByRole('button', { name: 'Dar de baja' }).click();
            await expect(page.locator('.aviso-flotante')).toContainText('Se rechazó');
        });

        await paso(page, 'Fin', () => salir(page));
    } finally {
        await duenio.del(`/api/mis-vehiculos/${a.id}`);
        await duenio.del(`/api/mis-vehiculos/${b.id}`);
        await duenio.cerrar();
    }
});
