// Empresas (concesionarias): una se suma desde "Sumá tu concesionaria", no puede ingresar hasta que el admin la
// aprueba, después ve su panel y "Mi empresa" en la barra. Explorar ordena por "Más relevantes" y filtra por vendedor.
// Crea una cuenta: no corre contra producción.
//
// Variables: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (alguien con usuarios.editar; sin ellas se saltea la aprobación)
import { test, expect } from '@playwright/test';
import { pagina, soloFueraDeProduccion, emailNuevo, PASSWORD } from './entorno.js';

const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };

async function ingresar(page, email, password) {
    await page.goto(pagina('pages/auth/login.html'));
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#form-login button[type="submit"]');
}

test('una concesionaria se suma, el admin la aprueba y ve su panel', async ({ page }) => {
    soloFueraDeProduccion();
    test.skip(!ADMIN.email || !ADMIN.password, 'Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD.');
    test.setTimeout(120_000); // Render puede estar dormido
    const email = emailNuevo();
    const nombre = `Concesionaria E2E ${Date.now()}`;

    await test.step('manda la solicitud desde "Sumá tu concesionaria"', async () => {
        await page.goto(pagina('pages/vehiculos/empresas-sumarse.html'));
        await page.fill('#razon_social', nombre);
        await page.fill('#cuit', '30-71234567-9');
        await page.fill('#localidad', 'Luján');
        await page.fill('#telefono', '2323 445566');
        await page.fill('#responsable', 'Responsable E2E');
        await page.fill('#email', email);
        await page.fill('#password', PASSWORD);
        await page.check('#condiciones');
        await page.click('#form-empresa button[type="submit"]');
        await expect(page.locator('#estado-solicitud')).toContainText('pendiente', { timeout: 60_000 });
    });

    await test.step('mientras está pendiente no puede ingresar', async () => {
        await ingresar(page, email, PASSWORD);
        await expect(page.locator('.formulario__alerta')).toContainText('en revisión');
    });

    await test.step('el admin la aprueba', async () => {
        await ingresar(page, ADMIN.email, ADMIN.password);
        await expect(page).not.toHaveURL(/login\.html/);
        await page.goto(pagina('pages/admin/admin-empresas.html'));
        const tarjeta = page.locator('#lista article', { hasText: nombre });
        await tarjeta.getByRole('button', { name: 'Aprobar' }).click();
        await expect(page.locator('#aviso')).toContainText(nombre);
        await page.goto(pagina('pages/auth/cuenta.html'));
        await page.getByRole('button', { name: /Cerrar sesión|Salir/ }).first().click();
    });

    await test.step('aprobada, ingresa y ve su panel con "Mi empresa" en la barra', async () => {
        await ingresar(page, email, PASSWORD);
        await expect(page).not.toHaveURL(/login\.html/);
        await page.goto(pagina('pages/vehiculos/empresa-panel.html'));
        await expect(page.locator('#kpis > li')).toHaveCount(5, { timeout: 60_000 });
        await expect(page.locator('#panel-empresa-nombre')).toContainText(nombre);
        await expect(page.locator('.barra__lista')).toContainText('Mi empresa');
        await page.getByRole('button', { name: '7 días' }).click();
        await expect(page.locator('#serie > li').or(page.locator('#serie-vacia'))).not.toHaveCount(0);
    });
});

test('Explorar ordena por "Más relevantes" y filtra por vendedor', async ({ page }) => {
    await page.goto(pagina('pages/info/home.html'));
    await expect(page.locator('#f-orden')).toHaveValue('');
    await expect(page.locator('#f-orden option').first()).toHaveText('Más relevantes');
    const pedido = page.waitForRequest((r) => r.url().includes('/api/vehiculos') && r.url().includes('vendedor=empresa'));
    await page.selectOption('#f-vendedor', 'empresa');
    await pedido;
    await expect(page).toHaveURL(/vendedor=empresa/);
    await expect(page.locator('.filtros-activos')).toContainText('Solo concesionarias');
    // Cada auto que aparece es de una concesionaria: lleva la insignia
    const fichas = await page.locator('#resultados .ficha-vehiculo').count();
    await expect(page.locator('#resultados .insignia-empresa')).toHaveCount(fichas);
});
