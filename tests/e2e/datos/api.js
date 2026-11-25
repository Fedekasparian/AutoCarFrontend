// Lo que comparten los scripts de datos de demo: a qué front se le pega, la sesión contra la API (cookie + CSRF,
// como el navegador), las fotos a subir y las cuentas guardadas en tests/e2e/abm/ (archivos locales, fuera del repo).
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const BASE = (process.env.BASE_URL || 'https://autocar-git-dev-autocar4.vercel.app').replace(/\/$/, '');
export const FOTOS_DIR = process.env.FOTOS_DIR || join(AQUI, '..', 'fotos');
export const args = process.argv.slice(2);

// Valor de una opción "--nombre valor" de la línea de comandos
export const opcion = (nombre) => {
    const i = args.indexOf(nombre);
    return i >= 0 ? args[i + 1] : undefined;
};

export function noEnProduccionSinQuerer() {
    if (/autocar-zeta\.vercel\.app/.test(BASE) && !args.includes('--produccion')) {
        console.error('BASE_URL apunta a producción. Si es a propósito, agregá --produccion.');
        process.exit(1);
    }
}

export function sesion() {
    const cookies = {};
    let csrf = null;
    async function api(metodo, ruta, cuerpo) {
        const headers = { Accept: 'application/json', Origin: BASE };
        if (Object.keys(cookies).length) headers.Cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
        if (csrf && metodo !== 'GET') headers['X-CSRF-Token'] = csrf;
        let body;
        if (cuerpo instanceof FormData) body = cuerpo;
        else if (cuerpo !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(cuerpo); }
        // Render (plan gratuito) puede tardar en despertar: hasta 3 intentos si no responde
        let res;
        for (let intento = 1; ; intento++) {
            try {
                res = await fetch(BASE + ruta, { method: metodo, headers, body, signal: AbortSignal.timeout(120_000) });
                if (res.status !== 502 && res.status !== 503 && res.status !== 504) break;
            } catch (e) {
                if (intento >= 3) throw e;
            }
            if (intento >= 3) break;
            console.log(`   (el back no respondió, reintento ${intento}/2...)`);
            await new Promise((r) => setTimeout(r, 5000));
        }
        for (const c of res.headers.getSetCookie?.() ?? []) {
            const [par] = c.split(';');
            const i = par.indexOf('=');
            cookies[par.slice(0, i).trim()] = par.slice(i + 1).trim();
        }
        const texto = await res.text();
        let datos = null;
        try { datos = texto ? JSON.parse(texto) : null; } catch { datos = { crudo: texto.slice(0, 300) }; }
        return { status: res.status, datos };
    }
    return {
        api,
        async ingresar(email, password, quien) {
            if (!email || !password) throw new Error(`Faltan las credenciales de ${quien}.`);
            const r = await api('POST', '/api/login', { email, password });
            if (r.status !== 200) throw new Error(`No pudo ingresar ${quien} (${email}): ${r.datos?.mensaje ?? r.status}`);
            csrf = r.datos.csrf;
            return r.datos.usuario;
        },
    };
}

export async function fotos(dir = FOTOS_DIR) {
    const archivos = (await readdir(dir))
        .filter((f) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase()))
        .sort();
    if (!archivos.length) throw new Error(`No hay fotos en ${dir}`);
    const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    return Promise.all(archivos.map(async (f) => ({
        nombre: f, tipo: mime[extname(f).toLowerCase()], datos: await readFile(join(dir, f)),
    })));
}

const rutaCuenta = (archivo) => join(AQUI, '..', 'abm', archivo);

// Una cuenta guardada en tests/e2e/abm/; null si el archivo no está
export async function cuentaGuardada(archivo) {
    try { return JSON.parse(await readFile(rutaCuenta(archivo), 'utf8')); } catch { return null; }
}

export async function leerCuenta(archivo, siFalta) {
    const cuenta = await cuentaGuardada(archivo);
    if (!cuenta) { console.error(siFalta); process.exit(1); }
    return cuenta;
}

export const guardarCuenta = (archivo, datos) => writeFile(rutaCuenta(archivo), JSON.stringify(datos, null, 2));
