// Solicitudes de talleres (admin): un taller pide adherirse desde "Adherí tu taller" (alta de la solicitud) y el
// admin la rechaza con un motivo. No se aprueba a propósito: un taller aprobado aparece en el ranking público.
// La aprobación de una solicitud se ve en 01 con la concesionaria (mismo circuito).
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, ahora } from './comun.js';

test('08-admin-abm-talleres · un taller pide adherirse y el admin rechaza la solicitud', async ({ page }) => {
    const n = ahora();
    const taller = { nombre: `Taller Prueba ${n}`, email: `taller.prueba.${n}@autocar.test`, password: 'AutoCar2026' };
    const tarjeta = page.locator('#lista article', { hasText: taller.nombre });

    await paso(page, 'ALTA · un taller completa "Adherí tu taller"', async () => {
        await page.goto(pagina('pages/talleres/talleres-adherirse.html'));
        await page.fill('#nombre', taller.nombre);
        await page.fill('#cuit', `30-72${n.padStart(6, '0')}-1`);
        await page.fill('#direccion', 'Calle 27 N° 650');
        await page.fill('#localidad', 'Mercedes, Buenos Aires');
        await page.fill('#telefono', '02324 421234');
        await page.fill('#horarios', 'Lunes a viernes de 8 a 17');
        await page.fill('#precio_inspeccion', '100000');
        await page.fill('#responsable', 'Martín Prueba');
        await page.fill('#email', taller.email);
        await page.fill('#password', taller.password);
        await page.check('#condiciones');
        await page.click('#form-adhesion button[type="submit"]');
        await expect(page.locator('#estado-solicitud')).toContainText('pendiente', { timeout: 90_000 });
    });

    await paso(page, 'Admin ve la solicitud en "Por revisar"', async () => {
        await ingresar(page, USUARIOS.admin);
        await page.goto(pagina('pages/admin/admin-talleres.html?estado=pendiente'));
        await expect(tarjeta).toBeVisible({ timeout: 60_000 });
        await tarjeta.scrollIntoViewIfNeeded();
    });

    await paso(page, 'BAJA · la rechaza con un motivo', async () => {
        await tarjeta.getByRole('button', { name: 'Rechazar' }).click();
        const form = page.locator('#form-rechazar');
        await expect(form).toBeVisible();
        await form.locator('#motivo').fill('No pudimos verificar el CUIT ni la dirección del taller.');
        await form.getByRole('button', { name: 'Rechazar' }).click();
        await expect(form).toBeHidden();
        await expect(tarjeta).toHaveCount(0);
    });

    await paso(page, 'Queda en "Rechazadas" con el motivo', async () => {
        await page.goto(pagina('pages/admin/admin-talleres.html?estado=rechazado'));
        await expect(tarjeta).toContainText('No pudimos verificar el CUIT', { timeout: 60_000 });
        await tarjeta.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1200);
        await salir(page);
    });
});
