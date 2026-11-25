// ABM de usuarios (admin): alta de una cuenta desde el registro, modificación del nombre y el rol desde el panel,
// baja lógica (no puede ingresar) y reactivación. Al final la cuenta de prueba queda dada de baja.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, apiComo, ahora } from './comun.js';

test('05-admin-abm-usuarios · alta, modificación, baja y reactivación de un usuario', async ({ page, baseURL }) => {
    const n = ahora();
    const nuevo = { nombre: `Lucía Prueba ${n}`, email: `lucia.prueba.${n}@autocar.test`, password: 'AutoCar2026' };
    const fila = page.locator('#resultados tr', { hasText: nuevo.email });

    await paso(page, 'ALTA · una persona se registra en AutoCar', async () => {
        await page.goto(pagina('pages/auth/registro.html'));
        await page.fill('#nombre', nuevo.nombre);
        await page.fill('#email', nuevo.email);
        await page.fill('#password', nuevo.password);
        await page.fill('#password_confirm', nuevo.password);
        await page.check('#acepta_privacidad');
        await page.click('#form-registro button[type="submit"]');
        await expect(page).not.toHaveURL(/registro\.html/, { timeout: 90_000 });
        await page.goto(pagina('pages/auth/cuenta.html'));
        await expect(page.locator('#usuario-email')).toHaveText(nuevo.email);
        await salir(page);
    });

    await paso(page, 'Admin ingresa y busca la cuenta nueva', async () => {
        await ingresar(page, USUARIOS.admin);
        await page.goto(pagina(`pages/admin/admin-usuarios.html?q=${encodeURIComponent(nuevo.email)}`));
        await expect(fila).toContainText('Activa', { timeout: 60_000 });
    });

    await paso(page, 'MODIFICACIÓN · le corrige el nombre y la pasa a moderadora', async () => {
        await fila.getByRole('button', { name: 'Editar' }).click();
        const form = page.locator('#form-usuario');
        await expect(form).toBeVisible();
        await form.locator('#editar-nombre').fill(`Lucía Moderadora ${n}`);
        await form.locator('#editar-rol').selectOption('moderador');
        await page.waitForTimeout(800);
        await form.getByRole('button', { name: 'Guardar' }).click();
        await expect(form).toBeHidden();
        await expect(fila).toContainText(`Lucía Moderadora ${n}`);
        await expect(fila).toContainText(/Moderador/i);
    });

    await paso(page, 'BAJA · le da de baja la cuenta', async () => {
        await fila.getByRole('button', { name: 'Dar de baja' }).click();
        await expect(page.locator('#aviso')).toContainText('Se dio de baja');
        await expect(fila).toContainText('Dada de baja');
        await salir(page);
    });

    await paso(page, 'Dada de baja, la cuenta ya no puede ingresar', async () => {
        await page.goto(pagina('pages/auth/login.html'));
        await page.fill('#email', nuevo.email);
        await page.fill('#password', nuevo.password);
        await page.click('#form-login button[type="submit"]');
        await expect(page.locator('.formulario__alerta')).not.toBeEmpty();
        await expect(page).toHaveURL(/login\.html/);
    });

    await paso(page, 'El admin la reactiva y la vuelve a dar de baja', async () => {
        await ingresar(page, USUARIOS.admin);
        await page.goto(pagina(`pages/admin/admin-usuarios.html?q=${encodeURIComponent(nuevo.email)}`));
        await fila.getByRole('button', { name: 'Reactivar' }).click();
        await expect(page.locator('#aviso')).toContainText('Se reactivó');
        await expect(fila).toContainText('Activa');
        await fila.getByRole('button', { name: 'Dar de baja' }).click();
        await expect(fila).toContainText('Dada de baja');
    });

    // Fuera de cámara: la cuenta de prueba vuelve a usuario común (sigue dada de baja)
    const admin = await apiComo(baseURL, USUARIOS.admin);
    const { items } = await admin.get(`/api/admin/usuarios?q=${encodeURIComponent(nuevo.email)}`);
    if (items?.[0]) await admin.patch(`/api/admin/usuarios/${items[0].id}`, { rol: 'usuario' });
    await admin.cerrar();
});
