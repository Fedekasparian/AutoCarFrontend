// Carga 10 publicaciones completas (datos + foto) a nombre de una concesionaria, para tener la vitrina lista antes
// de grabar los ABM. Usa la misma API que el sitio (POST /api/mis-vehiculos, multipart con fotos[]).
//
//   node tests/e2e/datos/publicar-concesionaria.js            → crea las que falten (no duplica)
//   node tests/e2e/datos/publicar-concesionaria.js --aprobar  → además las aprueba con un moderador/admin
//   node tests/e2e/datos/publicar-concesionaria.js --borrar   → da de baja las que creó este script
//   ... --cuenta .concesionaria-2.json                        → con otra cuenta (la que crea nueva-concesionaria.js)
//
// Cuentas: la concesionaria sale de tests/e2e/abm/.concesionaria.json (la crea la prueba 01) y el moderador
// de tests/e2e/abm/.usuarios.json. Ninguno de los dos se sube al repo.
//
// Variables (todas opcionales):
//   BASE_URL           front a usar, sin barra final (por defecto dev: https://autocar-git-dev-autocar4.vercel.app)
//   FOTOS_DIR          carpeta con .jpg/.png/.webp (hasta 2 MB c/u); se reparten en orden. Por defecto tests/e2e/fotos
//
// Cada publicación lleva la marca "[demo-concesionaria]" al final de la descripción: así el script reconoce
// las suyas para no duplicarlas y para --borrar, sin tocar las demás publicaciones de la cuenta.
import { pathToFileURL } from 'node:url';
import { BASE, args, opcion, noEnProduccionSinQuerer, sesion, fotos, leerCuenta } from './api.js';

const MARCA = '[demo-concesionaria]';

export const AUTOS = [
    { marca: 'Toyota', modelo: 'Corolla', version: '2.0 XEI CVT', anio: 2022, precio: 28500000, kilometraje: 38000, combustible: 'nafta', transmision: 'automatica', condicion: 'excelente', descripcion: 'Único dueño, service oficial al día en concesionario. Cubiertas nuevas.' },
    { marca: 'Toyota', modelo: 'Hilux', version: '2.8 SRX 4x4 AT', anio: 2021, precio: 41900000, kilometraje: 72000, combustible: 'diesel', transmision: 'automatica', condicion: 'muy_bueno', descripcion: 'Cabina doble, cubre caja y enganche. Sin uso rural.' },
    { marca: 'Volkswagen', modelo: 'Amarok', version: 'V6 Highline', anio: 2020, precio: 39500000, kilometraje: 95000, combustible: 'diesel', transmision: 'automatica', condicion: 'muy_bueno', descripcion: 'Motor V6 258 CV. Services en VW. Lona marítima.' },
    { marca: 'Ford', modelo: 'Ranger', version: '3.2 XLT 4x4', anio: 2019, precio: 32000000, kilometraje: 110000, combustible: 'diesel', transmision: 'manual', condicion: 'bueno', descripcion: 'Distribución hecha a los 100.000 km. Papeles al día.' },
    { marca: 'Peugeot', modelo: '208', version: '1.6 Allure', anio: 2023, precio: 21800000, kilometraje: 15000, combustible: 'nafta', transmision: 'manual', condicion: 'excelente', descripcion: 'Como nuevo, garantía de fábrica vigente. Pantalla táctil y cámara.' },
    { marca: 'Fiat', modelo: 'Cronos', version: '1.3 Drive', anio: 2022, precio: 17900000, kilometraje: 42000, combustible: 'nafta', transmision: 'manual', condicion: 'muy_bueno', descripcion: 'Ideal primer auto. Bajo consumo, baúl grande.' },
    { marca: 'Chevrolet', modelo: 'Onix', version: '1.0 Turbo LTZ AT', anio: 2021, precio: 18500000, kilometraje: 51000, combustible: 'nafta', transmision: 'automatica', condicion: 'muy_bueno', descripcion: 'Turbo automático, Android Auto y Apple CarPlay.' },
    { marca: 'Renault', modelo: 'Sandero', version: '1.6 Stepway Intens', anio: 2020, precio: 15200000, kilometraje: 68000, combustible: 'nafta', transmision: 'manual', condicion: 'bueno', descripcion: 'Despeje alto, ideal ciudad y ruta. Detalle menor en paragolpes.' },
    { marca: 'Jeep', modelo: 'Renegade', version: '1.8 Sport AT', anio: 2021, precio: 24700000, kilometraje: 47000, combustible: 'nafta', transmision: 'automatica', condicion: 'muy_bueno', descripcion: 'SUV compacta, techo panorámico. Recibimos usado.', acepta_canje: true, busca_canje: 'Auto chico de menor valor' },
    { marca: 'Volkswagen', modelo: 'Taos', version: '1.4 TSI Highline', anio: 2023, precio: 36800000, kilometraje: 12000, combustible: 'nafta', transmision: 'automatica', condicion: 'excelente', descripcion: 'Full, tablero digital, asistente de carril. Financiación disponible.' },
];

const clave = (v) => `${v.marca}|${v.modelo}|${v.anio}`.toLowerCase();
const esDelScript = (v) => (v.descripcion ?? '').includes(MARCA);

/**
 * Publica (o con borrar, da de baja) los autos de la lista a nombre de la cuenta guardada en tests/e2e/abm/<cuenta>.
 * Con aprobar, un moderador/admin los deja disponibles.
 */
export async function publicar({ cuenta: archivo = '.concesionaria.json', autos = AUTOS, localidad = 'Luján', aprobar = false, borrar = false } = {}) {
    const empresa = sesion();
    const cuenta = await leerCuenta(archivo, `Falta tests/e2e/abm/${archivo}: primero creá la concesionaria (prueba 01 o nueva-concesionaria.js).`);
    const yo = await empresa.ingresar(cuenta.email, cuenta.password, 'la concesionaria');
    console.log(`Ingresó ${yo.nombre} <${yo.email}> (rol ${yo.rol})`);
    if (yo.rol !== 'empresa') console.warn('⚠ La cuenta no es de empresa: una cuenta personal tiene límite de autos activos.');

    const mias = (await empresa.api('GET', '/api/mis-vehiculos')).datos?.items ?? [];
    const propias = mias.filter((v) => esDelScript(v) && v.estado !== 'eliminado');

    if (borrar) {
        for (const v of propias) {
            const r = await empresa.api('DELETE', `/api/mis-vehiculos/${v.id}`);
            console.log(`${r.status === 204 ? '✔' : '✘'} baja #${v.id} ${v.marca} ${v.modelo} ${v.anio}`);
        }
        console.log(`Listo: ${propias.length} dadas de baja.`);
        return;
    }

    const yaEstan = new Map(propias.map((v) => [clave(v), v]));
    const imagenes = await fotos();
    const ids = [];
    let n = 0;
    for (const auto of autos) {
        const existente = yaEstan.get(clave(auto));
        if (existente) {
            console.log(`= ya estaba #${existente.id} ${auto.marca} ${auto.modelo} ${auto.anio} (${existente.estado})`);
            ids.push(existente);
            continue;
        }
        const form = new FormData();
        const campos = { ...auto, localidad: auto.localidad ?? localidad, descripcion: `${auto.descripcion}\n${MARCA}` };
        for (const [k, v] of Object.entries(campos)) {
            if (k === 'acepta_canje') { if (v) form.append(k, '1'); continue; }
            form.append(k, String(v));
        }
        const foto = imagenes[n++ % imagenes.length];
        form.append('fotos[]', new Blob([foto.datos], { type: foto.tipo }), foto.nombre);

        const r = await empresa.api('POST', '/api/mis-vehiculos', form);
        if (r.status === 201) {
            const v = r.datos.vehiculo;
            console.log(`✔ creada #${v.id} ${auto.marca} ${auto.modelo} ${auto.anio} (${v.estado}${v.completa ? '' : ', falta ' + v.faltan.join(', ')})`);
            ids.push(v);
        } else {
            console.log(`✘ ${auto.marca} ${auto.modelo} ${auto.anio}: ${r.status} ${r.datos?.mensaje ?? ''} ${JSON.stringify(r.datos?.errores ?? r.datos?.campos ?? '')}`);
        }
    }

    if (aprobar) {
        const mod = sesion();
        const moderador = (await leerCuenta('.usuarios.json', 'Falta tests/e2e/abm/.usuarios.json.')).moderador;
        const quien = await mod.ingresar(moderador.email, moderador.password, 'el moderador');
        console.log(`Aprueba ${quien.nombre} (${quien.rol})`);
        for (const v of ids.filter((x) => x.estado === 'pendiente')) {
            const r = await mod.api('PATCH', `/api/admin/vehiculos/${v.id}/estado`, { estado: 'disponible' });
            console.log(`${r.status === 200 ? '✔ aprobada' : '✘ ' + r.status + ' ' + (r.datos?.mensaje ?? '')} #${v.id} ${v.marca} ${v.modelo}`);
        }
    }
    console.log(`Listo: ${ids.length}/${autos.length} publicaciones de la concesionaria.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    noEnProduccionSinQuerer();
    console.log(`Front: ${BASE}`);
    publicar({
        cuenta: opcion('--cuenta'),
        localidad: process.env.LOCALIDAD,
        aprobar: args.includes('--aprobar'),
        borrar: args.includes('--borrar'),
    }).catch((e) => { console.error('✘', e.message); process.exit(1); });
}
