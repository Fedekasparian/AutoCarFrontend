// Estadísticas del admin: pestañas, período (queda en la URL), embudo de recomendaciones con "compró = pagó la
// inspección" y la fórmula de "para vos" en Parámetros. Solo lee: puede correr también contra producción.
//
// Variables: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (alguien con metricas.ver y parametros.editar; sin ellas se saltea)
import { test, expect } from '@playwright/test';
import { pagina } from './entorno.js';

const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };

test('el admin recorre las estadísticas y ve la fórmula de para vos', async ({ page }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD.');
    test.setTimeout(120_000); // Render puede estar dormido

    await page.goto(pagina('pages/auth/login.html'));
    await page.fill('#email', ADMIN.email);
    await page.fill('#password', ADMIN.password);
    await page.click('#form-login button[type="submit"]');
    await expect(page).not.toHaveURL(/login\.html/);

    await test.step('el resumen muestra los indicadores y aclara qué es "compró"', async () => {
        await page.goto(pagina('pages/admin/admin-metricas.html'));
        await expect(page.locator('#p-resumen')).toBeVisible({ timeout: 60_000 });
        await expect(page.locator('#kpis > li')).toHaveCount(4); // sin "Pagado por reclamos" desde el 23/11
        await expect(page.locator('#p-resumen')).toContainText('pagó la inspección');
        await expect(page.locator('#p-plata')).toBeHidden();
    });

    await test.step('la pestaña Recomendaciones tiene el embudo y la tabla por origen', async () => {
        await page.getByRole('button', { name: 'Recomendaciones' }).click();
        await expect(page).toHaveURL(/#embudo$/);
        await expect(page.locator('#p-embudo')).toBeVisible();
        await expect(page.locator('#p-resumen')).toBeHidden();
        await expect(page.locator('#embudo-total > li')).toHaveCount(4);
        await expect(page.locator('#tabla-embudo tbody tr')).toHaveCount(4);
        // Por tipo de usuario: Todos, los 4 perfiles y "Sin perfil"; al elegir uno, la tabla es solo de ese perfil
        await expect(page.locator('#segmento-embudo button')).toHaveCount(6);
        // La misma tabla en plata: ganancia y cuánto deja por persona que vio, tocó o pagó
        await expect(page.locator('#tabla-ganancia-embudo thead th')).toHaveCount(5);
        await expect(page.locator('#tabla-ganancia-embudo tbody tr')).toHaveCount(4);
        await page.locator('#segmento-embudo').getByRole('button', { name: 'Para la familia' }).click();
        await expect(page.locator('#tabla-embudo-titulo')).toHaveText('Qué recomendación funciona mejor · Para la familia');
        await expect(page.locator('#ganancia-embudo-titulo')).toHaveText('Cuánta ganancia deja cada recomendación · Para la familia');
        await page.locator('#segmento-embudo').getByRole('button', { name: 'Todos' }).click();
        await expect(page.locator('#tabla-embudo-titulo')).toHaveText('Qué recomendación funciona mejor');
        // Cuánto le cuesta decidirse a cada tipo de usuario: 2 indicadores y una fila por perfil
        await expect(page.locator('#kpis-valor > li')).toHaveCount(2);
        await expect(page.locator('#tabla-valor thead th')).toHaveCount(6);
        await expect(page.locator('#tabla-valor tbody tr')).toHaveCount(5);
    });

    await test.step('la pestaña Inspecciones muestra estados, conclusiones y talleres', async () => {
        await page.getByRole('button', { name: 'Inspecciones' }).click();
        await expect(page).toHaveURL(/#inspecciones$/);
        await expect(page.locator('#kpis-inspecciones > li')).toHaveCount(4); // sin las de reclamos (23/11)
        await expect(page.locator('#barras-inspecciones > li').first()).toBeVisible();
        await expect(page.locator('#tabla-mecanicos thead th')).toHaveCount(3); // Taller, Firmadas, Cobrado
    });

    await test.step('el período cambia y queda en la URL', async () => {
        await page.getByRole('button', { name: '3 meses' }).click();
        await expect(page).toHaveURL(/dias=90#inspecciones$/); // sigue en la pestaña que estaba abierta
        await expect(page.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: 'Plata' }).click();
        await expect(page.locator('#grafico-ganancia .tendencia__nombre')).toHaveText('Ingresos de AutoCar');
        await expect(page.locator('#grafico-reclamos')).toHaveCount(0); // sin reclamos desde el 23/11
        // El informe: la ganancia (sin pérdida por reclamos desde el 23/11), con la frase que lo resume
        await expect(page.locator('#informe-plata')).toBeVisible();
        await expect(page.locator('#t-informe')).toHaveText('Informe de los últimos 3 meses');
        await expect(page.locator('#informe-cuenta dt')).toHaveCount(4);
        await expect(page.locator('#informe-cuenta .informe-plata__fila--neta dt')).toContainText('Ingresos del período');
        await expect(page.locator('#informe-cuenta')).toContainText('Clics a plataformas');
        await expect(page.locator('#informe-notas')).toContainText('Clics pendientes');
        // Segmentar por tipo de usuario: el informe pasa a ser solo de esos compradores
        await expect(page.locator('#tabla-plata-perfil tbody tr')).toHaveCount(5);
        await page.locator('#segmento-plata').getByRole('button', { name: 'Para la familia' }).click();
        await expect(page.locator('#t-informe')).toHaveText('Informe de los últimos 3 meses · compradores "Para la familia"');
        await expect(page.locator('#segmento-plata').getByRole('button', { name: 'Para la familia' })).toHaveAttribute('aria-pressed', 'true');
        await page.locator('#segmento-plata').getByRole('button', { name: 'Todos' }).click();
        await expect(page.locator('#t-informe')).toHaveText('Informe de los últimos 3 meses');
        // Al recargar sigue en la misma pestaña y período
        await page.reload();
        await expect(page.locator('#p-plata')).toBeVisible({ timeout: 60_000 });
        await expect(page.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true');
    });

    await test.step('la pestaña Metabuscador compara buscaron y compraron y cómo ordena cada tipo de usuario', async () => {
        await page.getByRole('button', { name: 'Metabuscador' }).click();
        await expect(page).toHaveURL(/#metabuscador$/);
        await expect(page.locator('#kpis-metabuscador > li')).toHaveCount(3);
        // Todos + 5 tipos de usuario, cada uno con dos barras
        await expect(page.locator('#buscaron-compraron > li')).toHaveCount(6);
        await expect(page.locator('#buscaron-compraron .comparar__fila')).toHaveCount(12);
        await expect(page.locator('#tabla-ordenes thead th')).toHaveCount(6);
        await expect(page.locator('#tabla-ordenes tbody tr')).toHaveCount(5);
        await expect(page.locator('#sugerencias-orden > li').first()).toBeVisible();
    });

    await test.step('la pestaña Afiliaciones muestra el mes en curso, la evolución y los convenios', async () => {
        await page.getByRole('button', { name: 'Afiliaciones' }).click();
        await expect(page).toHaveURL(/#afiliaciones$/);
        await expect(page.locator('#kpis-afiliacion > li')).toHaveCount(3);
        await expect(page.locator('#tabla-afiliacion-mes thead th')).toHaveCount(6);
        await expect(page.locator('#tabla-afiliacion-mes tbody tr').last()).toContainText('Total del mes');
        await expect(page.locator('#meses-afiliacion > li')).toHaveCount(12);
        await expect(page.locator('#tabla-afiliacion-meses tbody tr')).toHaveCount(11);
        await expect(page.locator('#tabla-convenios tbody tr').first().locator('input[type="number"]')).toBeVisible();
    });

    await test.step('en Parámetros, la fórmula de para vos es una grilla de 4 perfiles por 4 criterios', async () => {
        await page.goto(pagina('pages/admin/admin-parametros.html'));
        await expect(page.locator('.formula__tabla tbody tr')).toHaveCount(4, { timeout: 60_000 });
        await expect(page.locator('.formula__peso')).toHaveCount(16);
        await expect(page.locator('#peso_familia_km')).toHaveAttribute('max', '5');
        // Las fallas de internet ya no están en Parámetros: tienen su pantalla
        await expect(page.locator('#form-falla')).toHaveCount(0);
    });

    await test.step('Fallas típicas: al elegir el modelo se ven las que ya tiene', async () => {
        await page.goto(pagina('pages/admin/admin-fallas.html'));
        await expect(page.locator('#falla-marca option')).not.toHaveCount(1, { timeout: 60_000 });
        await page.selectOption('#falla-marca', 'Volkswagen');
        await expect(page.locator('#falla-modelo')).toBeEnabled();
        await page.selectOption('#falla-modelo', 'Gol Trend');
        await expect(page.locator('#cargadas')).toBeVisible();
        await expect(page.locator('#cargadas-titulo')).toHaveText('Las que ya tiene el Volkswagen Gol Trend');
    });
});
