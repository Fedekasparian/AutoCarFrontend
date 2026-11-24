// Auto vendido (lo pidió el profe el 13/11): el vendedor confirma el turno de la inspección en Mis publicaciones y,
// si vende el auto antes del turno, la inspección se cae sola y al comprador se le devuelve todo.
// Escribe datos: corre contra dev o local, nunca contra producción.
//
// La publicación se arma por la API (un vendedor nuevo publica y el admin la aprueba); lo demás, desde el sitio.
// Variables: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (para aprobar la publicación; sin ellas se saltea)
//            E2E_MECANICO_EMAIL / E2E_MECANICO_PASSWORD / E2E_MECANICO_TALLER (por defecto, el mecánico 5 de la demo)
import { readFileSync } from 'node:fs';
import { test, expect, request as pedidos } from '@playwright/test';
import { pagina, soloFueraDeProduccion, emailNuevo, PASSWORD, contestarPreferencias, pagarPedido } from './entorno.js';

soloFueraDeProduccion();

const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const MECANICO = {
    email: process.env.E2E_MECANICO_EMAIL || 'mecanico5@demo.autocar.com.ar',
    password: process.env.E2E_MECANICO_PASSWORD || 'mecanico-demo',
    taller: process.env.E2E_MECANICO_TALLER || 'Medina Mecánica (demo)',
};
const FOTO = readFileSync(new URL('./fotos/ford-ka.jpg', import.meta.url));

// Una sesión por la API (a través del mismo /api del front): devuelve el contexto y el token CSRF
async function sesionApi(baseURL, email, password) {
    const api = await pedidos.newContext({ baseURL });
    const r = await api.post('/api/login', { data: { email, password } });
    expect(r.status(), await r.text()).toBe(200);
    return { api, csrf: (await r.json()).csrf };
}

async function ingresar(page, { email, password }, conPreferencias = false) {
    await page.goto(pagina('pages/auth/login.html'));
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#form-login button[type="submit"]');
    if (conPreferencias) await contestarPreferencias(page);
    await expect(page).toHaveURL(/home\.html/);
}

function turnoDeManana() {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    const dosCifras = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}T11:00`;
}

test('el vendedor confirma el turno y, si vende antes, la inspección se cae', async ({ browser, baseURL }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'Sin E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD no se puede aprobar la publicación.');
    test.setTimeout(300_000);
    const vendedor = { email: emailNuevo(), password: PASSWORD };
    let vehiculoId;
    let id;

    await test.step('un vendedor nuevo publica un auto y el admin lo aprueba (por la API)', async () => {
        const anonimo = await pedidos.newContext({ baseURL });
        const alta = await anonimo.post('/api/registro', { data: { nombre: 'Vendedor E2E', email: vendedor.email,
            password: PASSWORD, password_confirm: PASSWORD, acepta_privacidad: true } });
        expect(alta.status(), await alta.text()).toBe(201);
        const { api, csrf } = await sesionApi(baseURL, vendedor.email, PASSWORD);
        const publicada = await api.post('/api/mis-vehiculos', {
            headers: { 'X-CSRF-Token': csrf },
            multipart: { marca: 'Volkswagen', modelo: 'Gol Trend', anio: '2015', precio: '9000000', kilometraje: '90000',
                combustible: 'nafta', transmision: 'manual', condicion: 'bueno', localidad: 'Luján',
                'fotos[]': { name: 'ford-ka.jpg', mimeType: 'image/jpeg', buffer: FOTO } },
        });
        expect(publicada.status(), await publicada.text()).toBe(201);
        vehiculoId = (await publicada.json()).vehiculo.id;
        const admin = await sesionApi(baseURL, ADMIN.email, ADMIN.password);
        const aprobada = await admin.api.patch(`/api/admin/vehiculos/${vehiculoId}/estado`, {
            headers: { 'X-CSRF-Token': admin.csrf }, data: { estado: 'disponible' } });
        expect(aprobada.status(), await aprobada.text()).toBe(200);
    });

    const comprador = await (await browser.newContext()).newPage();
    await test.step('un comprador le manda un mecánico desde la publicación', async () => {
        await comprador.goto(pagina('pages/auth/registro.html'));
        await comprador.fill('#nombre', 'Comprador E2E');
        await comprador.fill('#email', emailNuevo());
        await comprador.fill('#password', PASSWORD);
        await comprador.fill('#password_confirm', PASSWORD);
        await comprador.check('#acepta_privacidad');
        await comprador.click('#form-registro button[type="submit"]');
        await contestarPreferencias(comprador);
        await comprador.goto(pagina(`pages/vehiculos/vehiculo.html?id=${vehiculoId}`));
        await comprador.click('#vehiculo-mecanico');
        await expect(comprador.locator('#marca-modelo')).toBeHidden(); // marca y modelo salen de la publicación
        await comprador.locator('#mecanicos label', { hasText: MECANICO.taller }).locator('input[type="radio"]').check();
        await comprador.check('#acepto_alcance');
        await comprador.click('#pedido button[type="submit"]');
        id = await pagarPedido(comprador); // con Mercado Pago activo, paga en el sandbox
    });

    await test.step('el mecánico acepta con un turno para mañana', async () => {
        const mecanico = await (await browser.newContext()).newPage();
        await ingresar(mecanico, MECANICO);
        await mecanico.goto(pagina('pages/talleres/taller.html'));
        // La de esta corrida, por el link a su publicación (corridas anteriores pueden dejar pedidos del mismo auto sin pagar)
        const fila = mecanico.locator('.fila--inspeccion').filter({ has: mecanico.locator(`a[href*="vehiculo.html?id=${vehiculoId}"]`) });
        await fila.getByRole('button', { name: 'Aceptar' }).click();
        await mecanico.fill('#aceptar-fecha', turnoDeManana());
        await mecanico.click('#form-aceptar button[type="submit"]');
        await expect(mecanico.locator('#aviso')).toContainText('Aceptaste');
        await mecanico.context().close();
    });

    const paginaVendedor = await (await browser.newContext()).newPage();
    await test.step('el vendedor ve el turno en Mis publicaciones y lo confirma', async () => {
        await ingresar(paginaVendedor, vendedor, true);
        await paginaVendedor.goto(pagina('pages/vehiculos/mis-publicaciones.html'));
        await expect(paginaVendedor.locator('#turnos')).toBeVisible();
        await expect(paginaVendedor.locator('#turnos-lista')).not.toContainText(MECANICO.taller); // no sabe quién es
        await paginaVendedor.click(`#confirmar-turno-${id}`);
        await expect(paginaVendedor.locator('#turnos-lista')).toContainText('Confirmado');

        await comprador.goto(pagina(`pages/talleres/verificacion.html?id=${id}`));
        await expect(comprador.locator('#resumen-datos')).toContainText('Confirmó el turno');
    });

    await test.step('vende el auto antes del turno: la inspección se cae y se le devuelve todo al comprador', async () => {
        await paginaVendedor.getByRole('button', { name: 'Marcar vendida' }).first().click();
        await paginaVendedor.getByRole('button', { name: 'Sí, la vendí' }).click();
        await expect(paginaVendedor.locator('#aviso')).toContainText('vendida');
        await expect(paginaVendedor.locator('#turnos')).toBeHidden();

        await comprador.reload();
        await expect(comprador.locator('#resumen-estado')).toContainText('Se cayó');
        await expect(comprador.locator('#resumen-datos')).toContainText('Te lo devolvimos');
    });

    await comprador.context().close();
    await paginaVendedor.context().close();
});
