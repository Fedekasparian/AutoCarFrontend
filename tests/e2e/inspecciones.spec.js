// F9: el recorrido de la demo de inspecciones, de punta a punta y con tres navegadores a la vez
// (comprador, mecánico y admin), como se muestra el 30/11:
//   ranking → pedir → aceptar → checklist y firma → informe → reclamo → resolución.
// Además: foto obligatoria de cada falla, marca y modelo (obligatorios para firmar), una falla típica que propone el mecánico (idea B) y el costo total
// con el presupuesto de otro taller de la red (idea A).
// Escribe datos: corre contra dev o local, nunca contra producción.
//
// Necesita los datos de demo del back (database/demo-inspecciones.sql). Usa al mecánico 5 (Luján) para no
// tocar al mecánico 1, que es el de la demo en vivo. El reclamo se resuelve "no procede" para no bajarlo en el
// ranking; el tope de la compensación se prueba antes, sin guardar.
//
// Variables:
//   E2E_MECANICO_EMAIL / E2E_MECANICO_PASSWORD / E2E_MECANICO_TALLER  (por defecto, el mecánico 5 de la demo)
//   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD  (alguien con reclamos.resolver; sin ellas se saltea la resolución)
import { test, expect } from '@playwright/test';
import { pagina, soloFueraDeProduccion, emailNuevo, PASSWORD, contestarPreferencias } from './entorno.js';

soloFueraDeProduccion();

const MECANICO = {
    email: process.env.E2E_MECANICO_EMAIL || 'mecanico5@demo.autocar.com.ar',
    password: process.env.E2E_MECANICO_PASSWORD || 'mecanico-demo', // la del seed de demo-inspecciones.sql
    taller: process.env.E2E_MECANICO_TALLER || 'Medina Mecánica (demo)',
};
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };

// Patente propia de cada corrida (formato Mercosur) y una foto de la chapa de 1×1 píxel
const patente = `AE${String(Date.now() % 1000).padStart(3, '0')}ZZ`;
const CHAPA = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const CODIGOS = ['carroceria', 'estructura', 'motor', 'transmision', 'frenos',
    'suspension', 'neumaticos', 'electricidad', 'kilometraje', 'identificacion'];

async function registrar(page, nombre) {
    await page.goto(pagina('pages/auth/registro.html'));
    await page.fill('#nombre', nombre);
    await page.fill('#email', emailNuevo());
    await page.fill('#password', PASSWORD);
    await page.fill('#password_confirm', PASSWORD);
    await page.check('#acepta_privacidad');
    await page.click('#form-registro button[type="submit"]');
    await contestarPreferencias(page);
    await expect(page).toHaveURL(/home\.html/);
}

async function ingresar(page, { email, password }) {
    await page.goto(pagina('pages/auth/login.html'));
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#form-login button[type="submit"]');
    await expect(page).toHaveURL(/home\.html/);
}

// Mañana a las 10, en el formato de <input type="datetime-local">.
function turnoDeManana() {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    const dosCifras = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}T10:00`;
}

test('recorrido de la demo: pedir, aceptar, firmar, reclamar y resolver', async ({ browser }) => {
    test.setTimeout(360_000); // tres sesiones (en WebKit local tarda ~3 min) y, en dev, Render puede estar dormido
    const titulo = `E2E Volkswagen Gol ${Date.now()}`;
    const falla = `E2E pintura que se descascara ${Date.now()}`;
    const comprador = await (await browser.newContext()).newPage();
    const mecanico = await (await browser.newContext()).newPage();
    let id;

    await test.step('el comprador llega desde el aviso, elige al mecánico y pide la inspección', async () => {
        await registrar(comprador, 'Comprador E2E');
        // Como si viniera del botón "Mandale un mecánico" de un aviso: el link llega fijo
        const aviso = `https://auto.mercadolibre.com.ar/MLA-${Date.now()}-gol-trend-_JM`;
        await comprador.goto(pagina(`pages/talleres/pedir-inspeccion.html?url=${encodeURIComponent(aviso)}`));
        await expect(comprador.locator('#url')).toHaveValue(aviso);
        await comprador.locator('#mecanicos label', { hasText: MECANICO.taller }).locator('input[type="radio"]').check();
        await expect(comprador.locator('#resumen')).toBeVisible();
        await comprador.locator('#datos-auto summary').click();
        await comprador.fill('#titulo', titulo);
        await comprador.fill('#localidad', 'Luján');
        await comprador.fill('#precio_publicado', '9000000'); // con el precio del aviso, el informe arma el costo total
        // Marca y modelo del catálogo: le llegan al mecánico ya elegidos (los puede corregir)
        await comprador.selectOption('#marca', 'Volkswagen');
        await comprador.selectOption('#modelo', 'Gol Trend');

        // Sin aceptar el alcance no se puede pedir
        await comprador.click('#pedido button[type="submit"]');
        await expect(comprador.locator('#acepto_alcance-error')).not.toBeEmpty();
        await expect(comprador).toHaveURL(/pedir-inspeccion\.html/);

        await comprador.check('#acepto_alcance');
        await comprador.click('#pedido button[type="submit"]');
        await expect(comprador).toHaveURL(/mis-inspecciones\.html\?nueva=\d+/);
        id = Number(new URL(comprador.url()).searchParams.get('nueva'));
        await expect(comprador.locator('#lista')).toContainText(titulo);
    });

    await test.step('el mecánico acepta el pedido con un turno', async () => {
        await ingresar(mecanico, MECANICO);
        await mecanico.goto(pagina('pages/talleres/taller.html'));
        const fila = mecanico.locator('.fila--inspeccion', { hasText: titulo });
        await fila.getByRole('button', { name: 'Aceptar' }).click();
        await mecanico.fill('#aceptar-fecha', turnoDeManana());
        await mecanico.click('#form-aceptar button[type="submit"]');
        await expect(mecanico.locator('#aviso')).toBeVisible();
        await expect(mecanico.locator('#aviso a', { hasText: 'Revisar y firmar' })).toHaveAttribute('href', new RegExp(`id=${id}$`));
    });

    await test.step('el mecánico completa el checklist y firma', async () => {
        await mecanico.goto(pagina(`pages/talleres/taller-verificacion.html?id=${id}`));
        await expect(mecanico.locator('#informe')).toBeVisible();
        for (const codigo of CODIGOS) {
            let valor = 'ok';
            if (codigo === 'carroceria') valor = 'observado';
            if (codigo === 'frenos') valor = 'falla';
            await mecanico.click(`label[for="resultado-${codigo}-${valor}"]`);
        }
        await mecanico.fill('#nota-carroceria', 'Rayón en la puerta trasera izquierda');
        await mecanico.fill('#nota-frenos', 'Disco delantero rayado');
        await mecanico.click('label[for="conclusion-con_reparos"]');
        await mecanico.fill('#resumen', 'Auto en buen estado general. Revisar el rayón antes de cerrar el precio.');
        await expect(mecanico.locator('#progreso-texto')).toHaveText('10 de 10');

        // Sin la patente, la foto de la chapa y la foto de la falla no deja firmar
        await mecanico.click('#informe button[type="submit"]');
        await expect(mecanico.locator('#patente-error')).not.toBeEmpty();
        await expect(mecanico.locator('#patente_foto-error')).not.toBeEmpty();
        await expect(mecanico.locator('#foto-frenos-error')).not.toBeEmpty();
        await expect(mecanico.locator('#foto-carroceria-error')).toBeEmpty(); // en "observado" la foto es opcional
        await mecanico.setInputFiles('#foto-frenos', { name: 'frenos.png', mimeType: 'image/png', buffer: CHAPA });
        await expect(mecanico.locator('#foto-frenos-estado')).toContainText('cargada');
        await mecanico.fill('#patente', patente.toLowerCase());
        // Al cargar la patente se guarda el borrador y aparece si el auto ya se revisó (esta patente es nueva)
        await mecanico.locator('#patente').blur();
        await expect(mecanico.locator('#anteriores')).toContainText('primera inspección');
        await mecanico.setInputFiles('#patente_foto', { name: 'chapa.png', mimeType: 'image/png', buffer: CHAPA });
        await expect(mecanico.locator('#patente_foto-estado')).toContainText('cargada');

        // Marca y modelo vienen del pedido; con el modelo aparecen sus fallas típicas y el mecánico propone una
        await expect(mecanico.locator('#marca')).toHaveValue('Volkswagen');
        await expect(mecanico.locator('#modelo')).toHaveValue('Gol Trend');
        await expect(mecanico.locator('#fallas')).toBeVisible();
        await mecanico.click('#proponer-falla');
        await mecanico.selectOption('#falla-item', 'carroceria');
        await mecanico.fill('#falla-titulo', falla);
        await mecanico.click('#form-falla button[type="submit"]');
        await expect(mecanico.locator('#fallas-lista')).toContainText(falla);
        await expect(mecanico.locator('#item-carroceria')).toContainText('Falla típica de este modelo');

        await mecanico.click('#informe button[type="submit"]');
        await mecanico.click('#confirmar-firma');
        await expect(mecanico.locator('#firmado')).toBeVisible();
        await expect(mecanico.locator('#firmado-datos')).toContainText(MECANICO.taller);
        await expect(mecanico.locator('#firmado-anteriores')).toContainText('primera inspección');
        await expect(mecanico.locator('#firmado-datos')).not.toContainText(/[0-9a-f]{64}/); // la huella no se muestra
        await expect(mecanico.locator('#informe')).toBeHidden(); // firmado ya no se edita
    });

    await test.step('el comprador ve el informe firmado y reclama', async () => {
        await comprador.goto(pagina(`pages/talleres/verificacion.html?id=${id}`));
        await expect(comprador.locator('#informe')).toBeVisible();
        await expect(comprador.locator('#informe-conclusion')).toContainText('reparos');
        await expect(comprador.locator('#informe-firma')).toContainText(MECANICO.taller);
        await expect(comprador.locator('#informe-firma')).not.toContainText(/[0-9a-f]{64}/);
        await expect(comprador.locator('#tramites')).toBeVisible();

        // El informe trae el historial del auto (la patente es nueva: es la primera vez que se revisa)
        await expect(comprador.locator('#anteriores')).toBeVisible();
        await expect(comprador.locator('#anteriores')).toContainText('primera inspección');

        // Idea A: la carrocería observada se le pidió a otros talleres; idea B: la falla que propuso el mecánico
        await expect(comprador.locator('#costo')).toBeVisible();
        await expect(comprador.locator('#costo-lista')).toContainText('Carrocería');
        // La falla trae la foto que sacó el mecánico
        await expect(comprador.locator('.item-informe--falla .item-informe__foto img')).toHaveCount(1);
        await expect(comprador.locator('#costo-lista')).not.toContainText(MECANICO.taller); // el que revisó no presupuesta
        await expect(comprador.locator('#fallas')).toBeVisible();
        await expect(comprador.locator('#fallas-lista')).toContainText(falla);

        await expect(comprador.locator('#form-reclamo')).toBeVisible();
        await expect(comprador.locator('#reclamo-alcance details')).toBeAttached();
        await comprador.selectOption('#item_codigo', 'estructura');
        await comprador.fill('#descripcion', 'Tenía un golpe en el zócalo derecho y el informe no lo marca.');
        await comprador.click('#form-reclamo button[type="submit"]');
        await expect(comprador.locator('#reclamo-datos')).toBeVisible();
        await expect(comprador.locator('#reclamo-datos')).toContainText('En revisión');
        await expect(comprador.locator('#form-reclamo')).toBeHidden(); // un solo reclamo
    });

    await test.step('otro taller de la red presupuesta el arreglo y entra en el costo total', async () => {
        // Al firmar, el arreglo se le pidió a otros talleres de la red (no sabemos a cuáles): se busca uno de demo que lo tenga
        const otro = await (await browser.newContext()).newPage();
        let respondio = false;
        for (const n of [1, 2, 3, 4]) {
            await ingresar(otro, { email: `mecanico${n}@demo.autocar.com.ar`, password: MECANICO.password });
            await otro.goto(pagina('pages/talleres/taller.html'));
            const fila = otro.locator('#presupuestos-lista li', { hasText: titulo });
            await otro.locator('#presupuestos-estado, #presupuestos-lista li').first().waitFor();
            if (await fila.count()) {
                await fila.getByRole('button', { name: 'Presupuestar' }).click();
                await otro.fill('#presupuesto-monto', '85000');
                await otro.fill('#presupuesto-detalle', 'Pulido y retoque de pintura de la puerta');
                await otro.click('#form-presupuesto button[type="submit"]');
                await expect(otro.locator('#aviso')).toContainText('Enviaste el presupuesto');
                respondio = true;
                break;
            }
            await otro.context().clearCookies();
        }
        await otro.context().close();
        if (!respondio) {
            test.info().annotations.push({ type: 'salteado', description: 'El pedido de presupuesto no fue a ningún taller de demo 1 a 4.' });
            return;
        }
        await comprador.reload();
        await expect(comprador.locator('#costo-lista')).toContainText('El más barato');
        await expect(comprador.locator('#costo-lista')).toContainText('Costo total');
        await expect(comprador.locator('#costo-lista')).toContainText('9.085.000'); // $ 9.000.000 del aviso + $ 85.000
    });

    await test.step('otro usuario no puede ver la inspección', async () => {
        const intruso = await (await browser.newContext()).newPage();
        await registrar(intruso, 'Intruso E2E');
        await intruso.goto(pagina(`pages/talleres/verificacion.html?id=${id}`));
        await expect(intruso.locator('#estado')).not.toBeEmpty();
        await expect(intruso.locator('#resumen')).toBeHidden();
        await expect(intruso.locator('#informe')).toBeHidden();
        await intruso.context().close();
    });

    await test.step('el admin resuelve el reclamo', async () => {
        if (!ADMIN.email || !ADMIN.password) {
            test.info().annotations.push({ type: 'salteado', description: 'Sin E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD no se prueba la resolución.' });
            return;
        }
        const admin = await (await browser.newContext()).newPage();
        await ingresar(admin, ADMIN);
        await admin.goto(pagina('pages/admin/admin-reclamos.html'));
        const tarjeta = admin.locator('article', { hasText: titulo });
        await tarjeta.getByRole('button', { name: 'Resolver' }).click();

        // La compensación no puede pasar el tope (3 veces el precio): no se guarda
        await admin.check('#decision-procede');
        const tope = Number(await admin.locator('#compensacion').getAttribute('max'));
        expect(tope).toBeGreaterThan(0);
        await admin.fill('#compensacion', String(tope + 1000));
        await admin.fill('#respuesta', 'Prueba del tope');
        await admin.click('#form-resolver button[type="submit"]');
        await expect(admin.locator('#compensacion-error')).not.toBeEmpty();

        await admin.check('#decision-no');
        await admin.fill('#respuesta', 'El golpe no se veía sin levantar el auto: queda fuera del alcance.');
        await admin.click('#form-resolver button[type="submit"]');
        await expect(tarjeta).toBeHidden();

        await comprador.reload();
        await expect(comprador.locator('#reclamo-datos')).toContainText('No procede');
        await expect(comprador.locator('#reclamo-datos')).toContainText('fuera del alcance');
        await admin.context().close();
    });

    await comprador.context().close();
    await mecanico.context().close();
});

test('desde un aviso, el link del auto viene fijo y no se puede cambiar', async ({ page }) => {
    const aviso = `https://auto.mercadolibre.com.ar/MLA-${Date.now()}-gol-trend-_JM`;
    await registrar(page, 'Comprador E2E');
    await page.goto(pagina(`pages/talleres/pedir-inspeccion.html?url=${encodeURIComponent(aviso)}`));
    const campo = page.locator('#url');
    await expect(campo).toHaveValue(aviso);
    await expect(campo).toHaveAttribute('readonly', '');
    await expect(page.locator('#url-ayuda')).toContainText('que estabas mirando');

    // Sin ?url no se puede pedir: hay que entrar desde el auto
    await page.goto(pagina('pages/talleres/pedir-inspeccion.html'));
    await expect(page.locator('#sin-auto')).toContainText('Elegí primero el auto');
    await expect(page.locator('#pedido')).toBeHidden();
});
