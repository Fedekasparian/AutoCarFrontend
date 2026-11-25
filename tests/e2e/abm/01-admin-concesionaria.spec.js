// ABM de concesionarias: la empresa pide sumarse desde "Sumá tu concesionaria" (alta de la solicitud y de su cuenta),
// no puede ingresar mientras está pendiente, el admin la aprueba y la concesionaria entra a su panel.
// La cuenta queda guardada en .concesionaria.json para la prueba 02 y para el script de las 10 publicaciones.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, guardarConcesionaria, ahora, claveNueva } from './comun.js';

test('01-admin-abm-concesionaria · una concesionaria se suma, el admin la aprueba y entra a su panel', async ({ page }) => {
    const n = ahora();
    const empresa = {
        razon_social: `Automotores Mercedes ${n}`,
        email: `concesionaria.${n}@autocar.test`,
        password: claveNueva(),
    };

    await paso(page, 'ALTA · la concesionaria completa "Sumá tu concesionaria"', async () => {
        await page.goto(pagina('pages/vehiculos/empresas-sumarse.html'));
        await page.fill('#razon_social', empresa.razon_social);
        await page.fill('#cuit', `30-71${n.padStart(6, '0')}-4`);
        await page.fill('#localidad', 'Mercedes, Buenos Aires');
        await page.fill('#telefono', '2324 445566');
        await page.fill('#responsable', 'Laura Méndez');
        await page.fill('#email', empresa.email);
        await page.fill('#password', empresa.password);
        await page.check('#condiciones');
        await page.click('#form-empresa button[type="submit"]');
        await expect(page.locator('#estado-solicitud')).toContainText('pendiente', { timeout: 90_000 });
    });

    await paso(page, 'Mientras está pendiente, no puede ingresar', async () => {
        await page.goto(pagina('pages/auth/login.html'));
        await page.fill('#email', empresa.email);
        await page.fill('#password', empresa.password);
        await page.click('#form-login button[type="submit"]');
        await expect(page.locator('.formulario__alerta')).toContainText('en revisión');
    });

    await paso(page, 'Admin ingresa y revisa las solicitudes pendientes', async () => {
        await ingresar(page, USUARIOS.admin);
        await page.goto(pagina('pages/admin/admin-empresas.html'));
        await expect(page.locator('#lista article', { hasText: empresa.razon_social })).toBeVisible();
    });

    await paso(page, 'MODIFICACIÓN · el admin aprueba la solicitud', async () => {
        const tarjeta = page.locator('#lista article', { hasText: empresa.razon_social });
        await tarjeta.getByRole('button', { name: 'Aprobar' }).click();
        await expect(page.locator('#aviso')).toContainText(empresa.razon_social);
        guardarConcesionaria(empresa);
        await salir(page);
    });

    await paso(page, 'Aprobada: la concesionaria ingresa y ve su panel', async () => {
        await ingresar(page, empresa);
        await page.goto(pagina('pages/vehiculos/empresa-panel.html'));
        await expect(page.locator('#panel-empresa-nombre')).toContainText(empresa.razon_social, { timeout: 60_000 });
        await expect(page.locator('.barra__lista')).toContainText('Mi empresa');
        await page.waitForTimeout(1500);
        await salir(page);
    });
});
