// Metabuscador del lado del comprador: una cuenta nueva con perfil guarda una búsqueda, ve los 5 más recomendados con
// su mensaje, abre el listado completo y entra a la página de novedades. Crea una cuenta y una búsqueda: no corre
// contra producción.
//
// Variables opcionales: E2E_META_MARCA / E2E_META_MODELO (una marca y modelo con autos en el entorno; sin ellas usa la
// primera de cada lista y, si no tiene autos, se saltea lo que sigue)
import { test, expect } from '@playwright/test';
import { pagina, soloFueraDeProduccion, emailNuevo, PASSWORD, contestarPreferencias } from './entorno.js';

test('con perfil, los primeros de "Más recomendados" dicen por qué y se puede ver el listado completo y las novedades', async ({ page }) => {
    soloFueraDeProduccion();
    test.setTimeout(120_000); // Render puede estar dormido

    await page.goto(pagina('pages/auth/registro.html'));
    await page.fill('#nombre', 'Metabuscador E2E');
    await page.fill('#email', emailNuevo());
    await page.fill('#password', PASSWORD);
    await page.fill('#password_confirm', PASSWORD);
    await page.check('#acepta_privacidad');
    await page.click('#form-registro button[type="submit"]');
    await contestarPreferencias(page); // "Para la familia"

    await test.step('guarda una búsqueda', async () => {
        await page.goto(pagina('pages/operaciones/meta-busqueda-nueva.html'));
        await expect(page.locator('#marca option')).not.toHaveCount(1, { timeout: 60_000 });
        await page.selectOption('#marca', process.env.E2E_META_MARCA ? { label: process.env.E2E_META_MARCA } : { index: 1 });
        await expect(page.locator('#modelo option')).not.toHaveCount(1);
        await page.selectOption('#modelo', process.env.E2E_META_MODELO ? { label: process.env.E2E_META_MODELO } : { index: 1 });
        await page.click('#form-busqueda button[type="submit"]');
        await expect(page).toHaveURL(/meta-busqueda-resultados\.html\?id=\d+/, { timeout: 60_000 });
    });

    const id = new URL(page.url()).searchParams.get('id');
    await expect(page.locator('#filtros').or(page.locator('#estado .aviso'))).toBeVisible({ timeout: 60_000 });
    // Los 5 primeros van en #recomendados y el resto en #resultados
    const filas = page.locator('#recomendados > li, #resultados > li');
    test.skip((await filas.count()) === 0, 'El entorno no tiene autos del metabuscador para esa marca y modelo.');

    await test.step('"Más recomendados" muestra hasta 5, numerados, para el perfil elegido', async () => {
        await expect(page.locator('label.orden__opcion', { hasText: 'Más recomendados' }).locator('input')).toBeChecked();
        await expect(page.locator('#recomendados-intro')).toContainText('Para la familia');
        const recomendados = page.locator('.resultado--recomendado');
        expect(await recomendados.count()).toBeLessThanOrEqual(5);
        await expect(recomendados.first().locator('.resultado__puesto')).toHaveText('1');
        // El mensaje, cuando lo hay, nombra el perfil
        const mensajes = await page.locator('.resultado__mensaje').allTextContents();
        for (const m of mensajes) expect(m).toContain('Como lo buscás para la familia');
    });

    await test.step('"Ver listado completo" muestra el resto y queda en la URL', async () => {
        const verTodo = page.locator('#ver-todo');
        if (await verTodo.count()) {
            await verTodo.click();
            await expect(page).toHaveURL(/todo=1/);
            expect(await filas.count()).toBeGreaterThan(5);
            await expect(page.locator('#ver-todo')).toHaveCount(0);
        }
    });

    await test.step('con otro orden no hay recomendados ni mensajes', async () => {
        await page.locator('label.orden__opcion', { hasText: 'Menor precio' }).click();
        await expect(page).toHaveURL(/orden=precio/);
        await expect(page.locator('#resultados > li').first()).toBeVisible();
        await expect(page.locator('.resultado--recomendado')).toHaveCount(0);
        await expect(page.locator('#recomendados-intro')).toBeHidden();
    });

    await test.step('la página de novedades tiene el gráfico de 30 días y vuelve a los resultados', async () => {
        await page.goto(pagina(`pages/operaciones/meta-busqueda-novedades.html?id=${id}`));
        await expect(page.locator('#novedades')).toBeVisible({ timeout: 60_000 });
        await expect(page.locator('#titulo')).toContainText('Novedades');
        // Con novedades, 30 columnas; si no hubo ninguna, el aviso
        await expect(page.locator('#dias > li').or(page.locator('#dias-vacio'))).not.toHaveCount(0);
        await expect(page.locator('#volver')).toHaveAttribute('href', new RegExp(`meta-busqueda-resultados\\.html\\?id=${id}`));
    });
});
