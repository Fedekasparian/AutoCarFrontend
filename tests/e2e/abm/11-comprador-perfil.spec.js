// Modificación del perfil propio (Mateo Ríos, comprador): cambia el nombre, sube una foto de perfil, la quita
// y vuelve a dejar el nombre como estaba.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, FOTO, apiComo } from './comun.js';

test('11-comprador-abm-perfil · cambiar el nombre, subir y quitar la foto de perfil', async ({ page, baseURL }) => {
    const aviso = page.locator('#perfil-aviso');
    let original;

    try {
        await paso(page, 'Comprador: Mateo Ríos ingresa a Mi cuenta', async () => {
            await ingresar(page, USUARIOS.comprador);
            await page.goto(pagina('pages/auth/cuenta.html'));
            await expect(page.locator('#nombre')).not.toHaveValue('', { timeout: 60_000 });
            original = await page.locator('#nombre').inputValue();
        });

        await paso(page, 'MODIFICACIÓN · cambia su nombre', async () => {
            await page.locator('#form-perfil').scrollIntoViewIfNeeded();
            await page.fill('#nombre', `${original} Prueba`);
            await page.click('#form-perfil button[type="submit"]');
            await expect(aviso).toContainText('Guardamos tu nombre');
            await expect(page.locator('#usuario-nombre')).toContainText(`${original} Prueba`);
        });

        await paso(page, 'ALTA · sube una foto de perfil', async () => {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.setInputFiles('#foto', { name: 'perfil.jpg', mimeType: 'image/jpeg', buffer: FOTO });
            await expect(aviso).toContainText('Subimos tu foto', { timeout: 60_000 });
            await expect(page.locator('#quitar-foto')).toBeVisible();
            await page.waitForTimeout(1200);
        });

        await paso(page, 'BAJA · quita la foto', async () => {
            await page.click('#quitar-foto');
            await expect(aviso).toContainText('Quitamos tu foto');
            await expect(page.locator('#quitar-foto')).toBeHidden();
        });

        await paso(page, 'MODIFICACIÓN · vuelve a su nombre original', async () => {
            await page.locator('#form-perfil').scrollIntoViewIfNeeded();
            await page.fill('#nombre', original);
            await page.click('#form-perfil button[type="submit"]');
            await expect(page.locator('#usuario-nombre')).toContainText(original);
            await page.waitForTimeout(1000);
            await salir(page);
        });
    } finally {
        // Por si falló a mitad de camino: nombre original y sin foto
        if (original) {
            const yo = await apiComo(baseURL, USUARIOS.comprador);
            await yo.put('/api/me', { nombre: original });
            await yo.del('/api/me/foto');
            await yo.cerrar();
        }
    }
});
