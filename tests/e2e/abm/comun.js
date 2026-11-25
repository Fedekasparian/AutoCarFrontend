// Lo común de las pruebas de los ABM: usuarios, ingreso y salida, el cartel que explica cada paso en el video,
// el guardado del video con el nombre del flujo y un cliente de la API para preparar datos fuera de cámara.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { test as base, expect, request } from '@playwright/test';

export { expect };
export const pagina = (ruta) => `/front/${ruta}`;
export const FOTO = readFileSync(new URL('../fotos/ford-ka.jpg', import.meta.url));
export const ahora = () => Date.now().toString().slice(-6);

// Las cuentas (admin, moderador, comprador, vendedor, mecanico) van en tests/e2e/abm/.usuarios.json, que no se
// sube al repo: copiá usuarios.ejemplo.json a .usuarios.json y completá los mails y las claves.
const ARCHIVO_USUARIOS = new URL('./.usuarios.json', import.meta.url);
if (!existsSync(ARCHIVO_USUARIOS)) {
    throw new Error('Falta tests/e2e/abm/.usuarios.json: copiá usuarios.ejemplo.json y completá las cuentas.');
}
export const USUARIOS = JSON.parse(readFileSync(ARCHIVO_USUARIOS, 'utf8'));

// Clave al azar para las cuentas que crean las pruebas (01, 05, 08): mayúscula, minúsculas y números
export const claveNueva = () => `Pr${randomBytes(5).toString('hex')}9`;

// La concesionaria la crea 01 y la usa 02 (y el script de las 10 publicaciones): queda en este archivo
const ARCHIVO = new URL('./.concesionaria.json', import.meta.url);
export const guardarConcesionaria = (datos) => writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2));
export const concesionaria = () => (existsSync(ARCHIVO) ? JSON.parse(readFileSync(ARCHIVO, 'utf8')) : null);

// Cada prueba guarda su video como videos-abm/<lo que va antes de " · " en el título>.webm
export const test = base.extend({
    context: async ({ context }, use) => {
        // Cartel fijo arriba a la derecha con el paso actual; sobrevive a los cambios de página
        await context.addInitScript(() => {
            const pintar = () => {
                const texto = sessionStorage.getItem('rotulo-e2e');
                let caja = document.getElementById('rotulo-e2e');
                if (!texto) { caja?.remove(); return; }
                if (!caja) {
                    caja = document.createElement('div');
                    caja.id = 'rotulo-e2e';
                    caja.setAttribute('aria-hidden', 'true');
                    caja.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:46ch;'
                        + 'background:#111c;color:#fff;font:600 15px/1.35 system-ui,sans-serif;padding:10px 14px;'
                        + 'border-radius:10px;box-shadow:0 4px 14px #0005;pointer-events:none;white-space:pre-line';
                    document.documentElement.append(caja);
                }
                caja.textContent = texto;
            };
            window.__rotuloE2E = pintar;
            document.addEventListener('DOMContentLoaded', pintar);
            if (document.readyState !== 'loading') pintar();
        });
        await use(context);
    },
    page: async ({ page }, use, info) => {
        // "¿Para qué buscás el auto?" (y la casilla de privacidad) puede aparecer en cualquier página: se contesta
        // con el perfil que ya tenía el usuario, para no cambiarle nada
        const ETIQUETAS = { personal: 'Para mí', familia: 'Para la familia', trabajo: 'Para trabajar', aplicacion: 'Para manejar' };
        const cartel = page.locator('dialog.perfil-dialogo');
        await page.addLocatorHandler(cartel, async () => {
            const uso = await page.evaluate(() => JSON.parse(localStorage.getItem('autocar.sesion'))?.usuario?.preferencias?.uso);
            const casilla = cartel.locator('#acepta_privacidad');
            if (await casilla.count()) await casilla.check();
            const elegido = ETIQUETAS[uso] ? cartel.getByRole('button', { name: ETIQUETAS[uso] }) : cartel.getByRole('button').first();
            await elegido.click();
            await expect(cartel).toHaveCount(0);
        });
        await use(page);
        const nombre = info.title.split(' · ')[0].trim();
        const video = page.video();
        await page.close();
        if (video) {
            mkdirSync('videos-abm', { recursive: true });
            const sufijo = info.status === info.expectedStatus ? '' : '-FALLO';
            await video.saveAs(`videos-abm/${nombre}${sufijo}.webm`);
        }
    },
});

// Cambia el cartel del video y lo deja un momento a la vista
export async function rotulo(page, texto) {
    await page.evaluate((t) => { sessionStorage.setItem('rotulo-e2e', t); window.__rotuloE2E?.(); }, texto).catch(() => {});
    await page.waitForTimeout(900);
}

// Paso con nombre: aparece en el reporte y en el cartel del video
export async function paso(page, texto, cuerpo) {
    return test.step(texto, async () => {
        await rotulo(page, texto);
        return cuerpo();
    });
}

export async function ingresar(page, { email, password }) {
    await page.goto(pagina('pages/auth/login.html'));
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#form-login button[type="submit"]');
    await expect(page).not.toHaveURL(/login\.html/, { timeout: 90_000 }); // Render puede estar dormido
}

export async function salir(page) {
    await page.goto(pagina('pages/auth/cuenta.html'));
    await page.click('#salir');
    // Salir lleva a otra página: mientras navega, evaluate falla y se vuelve a probar
    await expect.poll(() => page.evaluate(() => localStorage.getItem('autocar.sesion')).catch(() => 'navegando')).toBeNull();
    await page.waitForLoadState();
}

// Ventana de confirmación abierta (<dialog class="hoja">): toca el botón con ese texto
export async function confirmarEnHoja(page, texto) {
    const hoja = page.locator('dialog.hoja[open]');
    await expect(hoja).toBeVisible();
    await hoja.getByRole('button', { name: texto, exact: true }).click();
    await expect(hoja).toHaveCount(0);
}

// Publica un auto entero desde publicar.html, paso por paso, y lo envía a revisión → id de la publicación
export async function publicarDesdeElFormulario(page, a) {
    await page.goto(pagina('pages/vehiculos/publicar.html'));
    await expect(page.locator('#form-publicar')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#marca option')).not.toHaveCount(1, { timeout: 60_000 });
    await page.selectOption('#marca', a.marca);
    await page.selectOption('#modelo', a.modelo);
    await page.fill('#anio', String(a.anio));
    if (a.version) await page.fill('#version', a.version);
    await page.click('#paso-siguiente');

    await expect(page.locator('#pasos-texto')).toContainText('Paso 2');
    await page.fill('#kilometraje', String(a.kilometraje));
    await page.selectOption('#combustible', a.combustible);
    const radio = a.transmision === 'automatica' ? 'tr-auto' : 'tr-manual';
    await page.click(`label[for="${radio}"]`);
    await expect(page.locator(`#${radio}`)).toBeChecked();
    await page.selectOption('#condicion', a.condicion);
    if (a.descripcion) await page.fill('#descripcion', a.descripcion);
    await page.click('#paso-siguiente');

    await expect(page.locator('#pasos-texto')).toContainText('Fotos');
    await page.setInputFiles('#fotos', [{ name: 'auto.jpg', mimeType: 'image/jpeg', buffer: FOTO }]);
    await page.click('#paso-siguiente');
    await expect(page.locator('#fotos-actuales li')).toHaveCount(1, { timeout: 60_000 });

    await expect(page.locator('#pasos-texto')).toContainText('Precio');
    await page.fill('#precio', String(a.precio));
    if (!a.acepta_canje) await page.uncheck('#acepta-canje', { force: true });
    await page.click('#paso-siguiente');

    await expect(page.locator('#pasos-texto')).toContainText('Ubicación');
    await page.fill('#localidad', a.localidad || 'Mercedes, Buenos Aires');
    await page.click('#paso-siguiente');

    await expect(page.locator('#completitud')).toContainText('Está completa');
    await page.waitForTimeout(1200); // que se vea el resumen
    const id = Number(new URL(page.url()).searchParams.get('id'));
    await page.click('#terminar');
    await expect(page.locator('#enviada')).toContainText('revisión');
    return id;
}

// La fila de una publicación en Mis publicaciones (la reconoce por el id del enlace Editar o Continuar)
export const filaPublicacion = (page, id) =>
    page.locator('li.publicacion', { has: page.locator(`a[href*="id=${id}"]`) });

// Da de baja las publicaciones de prueba (versión con "E2E-") que le hayan quedado a una cuenta
export async function limpiarPublicacionesDePrueba(baseURL, usuario) {
    const api = await apiComo(baseURL, usuario);
    for (const v of (await api.get('/api/mis-vehiculos')).items ?? []) {
        if ((v.version ?? '').includes('E2E-')) await api.del(`/api/mis-vehiculos/${v.id}`);
    }
    await api.cerrar();
}

// ---------- API, para preparar o limpiar datos sin que salga en el video ----------

export async function apiComo(baseURL, usuario) {
    const ctx = await request.newContext({ baseURL, timeout: 120_000 });
    const r = await ctx.post('/api/login', { data: usuario });
    expect(r.status(), `login de ${usuario.email}`).toBe(200);
    const { csrf } = await r.json();
    const h = { 'X-CSRF-Token': csrf };
    return {
        get: (ruta) => ctx.get(ruta).then((x) => x.json()),
        post: (ruta, data) => ctx.post(ruta, { data, headers: h }),
        put: (ruta, data) => ctx.put(ruta, { data, headers: h }),
        patch: (ruta, data) => ctx.patch(ruta, { data, headers: h }),
        del: (ruta) => ctx.delete(ruta, { headers: h }),
        // Publicación completa con una foto → el vehículo (queda 'pendiente')
        async publicar(datos) {
            const r = await ctx.post('/api/mis-vehiculos', {
                headers: h,
                multipart: {
                    localidad: 'Mercedes, Buenos Aires', condicion: 'muy_bueno', combustible: 'nafta',
                    transmision: 'manual', ...Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, String(v)])),
                    'fotos[]': { name: 'auto.jpg', mimeType: 'image/jpeg', buffer: FOTO },
                },
            });
            expect(r.status(), await r.text()).toBe(201);
            return (await r.json()).vehiculo;
        },
        cerrar: () => ctx.dispose(),
    };
}
