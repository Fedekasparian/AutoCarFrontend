// ABM de publicaciones de un particular (Diego Fernández, vendedor): alta desde el formulario por pasos,
// modificación del precio (vuelve a revisión) y baja (eliminar). Una cuenta personal tiene hasta
// limite_autos_particular autos activos; si Diego ya está en el límite, se sube en 1 mientras dura la prueba.
import { test, expect, USUARIOS, pagina, paso, ingresar, salir, confirmarEnHoja, publicarDesdeElFormulario,
    filaPublicacion, apiComo, ahora } from './comun.js';
import { irAlPaso } from './pasos.js';

test('03-vendedor-abm-publicaciones · alta, modificación y baja de una publicación', async ({ page, baseURL }) => {
    const admin = await apiComo(baseURL, USUARIOS.admin);
    const limite = (await admin.get('/api/parametros')).limite_autos_particular;
    await admin.put('/api/admin/parametros', { valores: { limite_autos_particular: limite + 1 } });
    try {
        const auto = {
            marca: 'Volkswagen', modelo: 'Gol Trend', anio: 2017, version: `1.6 Trendline E2E-${ahora()}`,
            kilometraje: 98000, combustible: 'nafta', transmision: 'manual', condicion: 'bueno',
            descripcion: 'Auto de prueba E2E: se elimina al terminar.', precio: 9800000,
        };
        let id;

        await paso(page, 'Vendedor: Diego Fernández ingresa', () => ingresar(page, USUARIOS.vendedor));

        await paso(page, 'ALTA · publica un Gol Trend 2017 paso por paso', async () => {
            id = await publicarDesdeElFormulario(page, auto);
            await page.click('#ir-a-mis-publicaciones');
            await expect(filaPublicacion(page, id)).toContainText('En revisión');
        });

        await paso(page, 'MODIFICACIÓN · le baja el precio a $9.300.000', async () => {
            await filaPublicacion(page, id).getByRole('link', { name: 'Editar' }).click();
            await expect(page).toHaveURL(new RegExp(`publicar\\.html\\?id=${id}`));
            await irAlPaso(page, 'Precio');
            await page.fill('#precio', '9300000');
            await irAlPaso(page, 'Revisión');
            await page.click('#terminar');
            await expect(page.locator('#enviada')).toContainText('revisión');
            await page.click('#ir-a-mis-publicaciones');
            await expect(filaPublicacion(page, id)).toContainText('9.300.000');
            await expect(filaPublicacion(page, id)).toContainText('En revisión');
        });

        await paso(page, 'BAJA · elimina la publicación', async () => {
            const fila = filaPublicacion(page, id);
            await fila.getByRole('button', { name: 'Eliminar' }).click();
            await confirmarEnHoja(page, 'Eliminar');
            await expect(page.locator('#aviso')).toContainText('Se eliminó');
            await expect(filaPublicacion(page, id)).toHaveCount(0);
        });

        await paso(page, 'Fin: la publicación ya no está', () => salir(page));
    } finally {
        // Si algo falló a mitad de camino, no queda ningún auto de prueba en la cuenta de Diego
        const vendedor = await apiComo(baseURL, USUARIOS.vendedor);
        for (const v of (await vendedor.get('/api/mis-vehiculos')).items ?? []) {
            if ((v.version ?? '').includes('E2E-')) await vendedor.del(`/api/mis-vehiculos/${v.id}`);
        }
        await vendedor.cerrar();
        await admin.put('/api/admin/parametros', { valores: { limite_autos_particular: limite } });
        await admin.cerrar();
    }
});
