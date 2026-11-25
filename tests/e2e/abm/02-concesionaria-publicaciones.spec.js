// ABM de publicaciones de una concesionaria (sin límite de autos): alta desde el formulario por pasos,
// modificación del kilometraje y el precio, y baja. Usa la concesionaria que crea la prueba 01.
import { test, expect, pagina, paso, ingresar, salir, confirmarEnHoja, publicarDesdeElFormulario,
    filaPublicacion, concesionaria, ahora, limpiarPublicacionesDePrueba } from './comun.js';
import { irAlPaso } from './pasos.js';

// Si algo falla a mitad de camino, no le queda ningún auto de prueba a la concesionaria
test.afterEach(async ({ baseURL }) => {
    if (concesionaria()) await limpiarPublicacionesDePrueba(baseURL, concesionaria());
});

test('02-concesionaria-abm-publicaciones · alta, modificación y baja de un auto de la concesionaria', async ({ page }) => {
    const empresa = concesionaria();
    test.skip(!empresa, 'Primero hay que correr 01 (crea la concesionaria).');
    const auto = {
        marca: 'Toyota', modelo: 'Corolla', anio: 2021, version: `2.0 XEI CVT E2E-${ahora()}`,
        kilometraje: 45000, combustible: 'nafta', transmision: 'automatica', condicion: 'excelente',
        descripcion: 'Unidad de concesionaria, service oficial al día. Publicación de prueba E2E.', precio: 26900000,
        acepta_canje: true,
    };
    let id;

    await paso(page, `Concesionaria: ${empresa.razon_social} ingresa`, () => ingresar(page, empresa));

    await paso(page, 'ALTA · publica un Toyota Corolla 2021', async () => {
        id = await publicarDesdeElFormulario(page, auto);
        await page.click('#ir-a-mis-publicaciones');
        await expect(filaPublicacion(page, id)).toContainText('En revisión');
    });

    await paso(page, 'MODIFICACIÓN · corrige el kilometraje y el precio', async () => {
        await filaPublicacion(page, id).getByRole('link', { name: 'Editar' }).click();
        await irAlPaso(page, 'Ficha técnica');
        await page.fill('#kilometraje', '47500');
        await irAlPaso(page, 'Precio');
        await page.fill('#precio', '25900000');
        await irAlPaso(page, 'Revisión');
        await expect(page.locator('#resumen')).toContainText('47.500');
        await page.click('#terminar');
        await expect(page.locator('#enviada')).toContainText('revisión');
        await page.click('#ir-a-mis-publicaciones');
        await expect(filaPublicacion(page, id)).toContainText('25.900.000');
        await expect(filaPublicacion(page, id)).toContainText('47.500');
    });

    await paso(page, 'BAJA · elimina la publicación', async () => {
        await filaPublicacion(page, id).getByRole('button', { name: 'Eliminar' }).click();
        await confirmarEnHoja(page, 'Eliminar');
        await expect(page.locator('#aviso')).toContainText('Se eliminó');
        await expect(filaPublicacion(page, id)).toHaveCount(0);
    });

    await paso(page, 'Fin', () => salir(page));
});
