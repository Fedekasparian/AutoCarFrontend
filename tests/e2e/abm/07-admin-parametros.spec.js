// Modificación de parámetros del negocio (admin): cambia "días que dura un presupuesto", lo ve en
// "Últimos cambios" y lo vuelve a dejar como estaba. Si algo falla, se restaura por la API.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, apiComo } from './comun.js';

const CLAVE = 'dias_presupuesto';

test('07-admin-modificacion-parametros · el admin cambia un parámetro y lo restaura', async ({ page, baseURL }) => {
    const admin = await apiComo(baseURL, USUARIOS.admin);
    const original = (await admin.get('/api/parametros'))[CLAVE];
    const nuevo = original + 5;
    const campo = page.locator(`#${CLAVE}`);
    const guardar = async (valor) => {
        await campo.scrollIntoViewIfNeeded();
        await campo.fill(String(valor));
        await page.waitForTimeout(700);
        await page.locator('#form-parametros button[type="submit"]').click();
        await expect(page.locator('#aviso')).toContainText('Guardamos los cambios');
        await expect(page.locator('#cambios li').first()).toContainText(`${valor}`);
        await page.locator('#cambios').scrollIntoViewIfNeeded();
    };

    try {
        await paso(page, 'Admin ingresa a Parámetros', async () => {
            await ingresar(page, USUARIOS.admin);
            await page.goto(pagina('pages/admin/admin-parametros.html'));
            await expect(campo).toHaveValue(String(original), { timeout: 60_000 });
        });

        await paso(page, `MODIFICACIÓN · días de un presupuesto: ${original} → ${nuevo}`, () => guardar(nuevo));

        await paso(page, 'Queda anotado en "Últimos cambios" con quién y cuándo', async () => {
            await page.reload();
            await expect(campo).toHaveValue(String(nuevo), { timeout: 60_000 });
            await page.locator('#cambios').scrollIntoViewIfNeeded();
            await page.waitForTimeout(1500);
        });

        await paso(page, `MODIFICACIÓN · lo vuelve a ${original}`, () => guardar(original));
        await paso(page, 'Fin', () => salir(page));
    } finally {
        if ((await admin.get('/api/parametros'))[CLAVE] !== original) {
            await admin.put('/api/admin/parametros', { valores: { [CLAVE]: original } });
        }
        await admin.cerrar();
    }
});
