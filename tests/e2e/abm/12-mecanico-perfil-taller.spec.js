// Modificación del perfil del taller (Raúl Ferreyra, mecánico): cambia el teléfono y el precio de la inspección,
// ve el desglose de lo que cobra y vuelve a dejar los datos como estaban.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, apiComo } from './comun.js';

const CAMPOS = ['nombre', 'direccion', 'localidad', 'telefono', 'precio'];

test('12-mecanico-abm-perfil-taller · el mecánico edita los datos de su taller y los restaura', async ({ page, baseURL }) => {
    const form = page.locator('#form-perfil');
    let original = null;

    const abrir = async () => {
        await page.click('#editar-perfil');
        await expect(form).toBeVisible();
    };
    const leer = async () => Object.fromEntries(await Promise.all(
        CAMPOS.map(async (c) => [c, await form.locator(`#perfil-${c}`).inputValue()])));

    try {
        await paso(page, 'Mecánico: Raúl Ferreyra ingresa a su taller', async () => {
            await ingresar(page, USUARIOS.mecanico);
            await page.goto(pagina('pages/talleres/taller.html'));
            await expect(page.locator('#editar-perfil')).toHaveText(/Editar/, { timeout: 60_000 }); // ya cargó el perfil
        });

        await paso(page, 'MODIFICACIÓN · cambia el teléfono y el precio de la inspección', async () => {
            await abrir();
            original = await leer();
            expect(original.nombre, 'el formulario tiene que venir con los datos del taller').not.toBe('');
            await form.locator('#perfil-telefono').fill('(02324) 15-555000');
            const precio = Number(original.precio) + 5000;
            await form.locator('#perfil-precio').fill(String(precio));
            await expect(page.locator('#perfil-precio-ayuda')).toContainText('cobrás');
            await page.waitForTimeout(1200);
            await form.getByRole('button', { name: 'Guardar' }).click();
            await expect(form).toBeHidden();
            await expect(page.locator('#aviso')).toContainText('Se guardó el perfil');
            await expect(page.locator('#perfil-datos')).toContainText('555000');
        });

        await paso(page, 'MODIFICACIÓN · vuelve a dejar los datos como estaban', async () => {
            await abrir();
            await form.locator('#perfil-telefono').fill(original.telefono);
            await form.locator('#perfil-precio').fill(original.precio);
            await page.waitForTimeout(800);
            await form.getByRole('button', { name: 'Guardar' }).click();
            await expect(form).toBeHidden();
            await expect(page.locator('#aviso')).toContainText('Se guardó el perfil');
            await page.waitForTimeout(1000);
            await salir(page);
        });
    } finally {
        if (original) {
            const yo = await apiComo(baseURL, USUARIOS.mecanico);
            await yo.put('/api/mecanico/perfil', {
                nombre: original.nombre, direccion: original.direccion, localidad: original.localidad,
                telefono: original.telefono, precio_inspeccion: Number(original.precio),
            });
            await yo.cerrar();
        }
    }
});
