// Suma otra concesionaria con 10 autos, por la misma API que el sitio:
//   1. pide sumarse ("Sumá tu concesionaria": POST /api/solicitudes-empresa, crea la cuenta con rol empresa)
//   2. un admin la aprueba (PATCH /api/admin/solicitudes-empresa/{id})
//   3. publica 10 autos distintos de los de la primera y un moderador los aprueba (publicar-concesionaria.js)
//
//   node tests/e2e/datos/nueva-concesionaria.js
//   node tests/e2e/datos/nueva-concesionaria.js --nombre "Autos del Oeste" --cuenta .concesionaria-3.json
//   node tests/e2e/datos/nueva-concesionaria.js --borrar      → da de baja sus 10 autos (la cuenta queda)
//
// Se puede volver a correr: si la cuenta ya está guardada no la crea de nuevo y solo publica los autos que falten.
// La cuenta queda en tests/e2e/abm/.concesionaria-2.json (o la de --cuenta); el admin y el moderador salen de
// tests/e2e/abm/.usuarios.json. Ninguno se sube al repo.
//
// Variables (todas opcionales): BASE_URL, FOTOS_DIR (por defecto tests/e2e/fotos/concesionaria-2) y LOCALIDAD
// (por defecto Mercedes), igual que publicar-concesionaria.js.
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { BASE, FOTOS_DIR, args, opcion, noEnProduccionSinQuerer, sesion, leerCuenta, cuentaGuardada, guardarCuenta } from './api.js';
import { publicar } from './publicar-concesionaria.js';

const ARCHIVO = opcion('--cuenta') || '.concesionaria-2.json';
// Sus fotos: tests/e2e/fotos/concesionaria-2 (o la carpeta de FOTOS_DIR)
const FOTOS = process.env.FOTOS_DIR || join(FOTOS_DIR, 'concesionaria-2');

const AUTOS = [
    { marca: 'Toyota', modelo: 'Yaris', version: '1.5 XLS CVT', anio: 2022, precio: 22400000, kilometraje: 33000, combustible: 'nafta', transmision: 'automatica', condicion: 'excelente', descripcion: 'Hatchback automático, service oficial. Ideal ciudad.' },
    { marca: 'Volkswagen', modelo: 'Polo', version: '1.6 MSI Highline', anio: 2021, precio: 19900000, kilometraje: 48000, combustible: 'nafta', transmision: 'manual', condicion: 'muy_bueno', descripcion: 'Pantalla con Apple CarPlay, sensores de estacionamiento.' },
    { marca: 'Volkswagen', modelo: 'T-Cross', version: '1.6 Comfortline', anio: 2022, precio: 27500000, kilometraje: 29000, combustible: 'nafta', transmision: 'manual', condicion: 'excelente', descripcion: 'SUV compacta, baúl amplio. Garantía de concesionario.' },
    { marca: 'Ford', modelo: 'Territory', version: '1.8 Titanium', anio: 2023, precio: 38900000, kilometraje: 14000, combustible: 'nafta', transmision: 'automatica', condicion: 'excelente', descripcion: 'Turbo, techo panorámico y pantalla de 12". Como nueva.' },
    { marca: 'Ford', modelo: 'Maverick', version: '2.0 Lariat AWD', anio: 2023, precio: 44500000, kilometraje: 18000, combustible: 'nafta', transmision: 'automatica', condicion: 'excelente', descripcion: 'Pick-up mediana 4x4, cuero y asistencias de manejo.' },
    { marca: 'Chevrolet', modelo: 'Tracker', version: '1.2 Turbo Premier AT', anio: 2021, precio: 25600000, kilometraje: 52000, combustible: 'nafta', transmision: 'automatica', condicion: 'muy_bueno', descripcion: 'Wi-Fi a bordo, OnStar, cámara de retroceso.' },
    { marca: 'Renault', modelo: 'Duster', version: '1.6 Intens 4x2', anio: 2020, precio: 17800000, kilometraje: 76000, combustible: 'gnc', transmision: 'manual', condicion: 'bueno', descripcion: 'Con equipo de GNC de 5ta generación. Muy económica.' },
    { marca: 'Fiat', modelo: 'Pulse', version: '1.3 Drive CVT', anio: 2022, precio: 21900000, kilometraje: 27000, combustible: 'nafta', transmision: 'automatica', condicion: 'muy_bueno', descripcion: 'Automático CVT, pantalla de 10". Financiación disponible.' },
    { marca: 'Peugeot', modelo: '2008', version: '1.6 Allure', anio: 2021, precio: 23300000, kilometraje: 44000, combustible: 'nafta', transmision: 'manual', condicion: 'muy_bueno', descripcion: 'i-Cockpit, control de tracción Grip Control.', acepta_canje: true, busca_canje: 'Auto de menor valor' },
    { marca: 'Nissan', modelo: 'Kicks', version: '1.6 Exclusive CVT', anio: 2022, precio: 26800000, kilometraje: 31000, combustible: 'nafta', transmision: 'automatica', condicion: 'excelente', descripcion: 'Cámara 360°, tapizado bitono. Único dueño.' },
];

// La cuenta guardada, o la crea (solicitud + aprobación del admin) y la guarda
async function asegurarCuenta() {
    const guardada = await cuentaGuardada(ARCHIVO);
    if (guardada) {
        console.log(`= la concesionaria ya estaba: ${guardada.razon_social} <${guardada.email}>`);
        if (guardada.usuario_id) await aprobar(guardada.usuario_id, true); // por si la otra vez quedó pendiente
        return guardada;
    }
    const n = Date.now().toString().slice(-6);
    const cuenta = {
        razon_social: opcion('--nombre') || `Autos del Oeste ${n}`,
        email: `concesionaria.${n}@autocar.test`,
        password: `Pr${randomBytes(5).toString('hex')}9`,
    };
    const r = await sesion().api('POST', '/api/solicitudes-empresa', {
        responsable: 'Martín Gómez', email: cuenta.email, password: cuenta.password, razon_social: cuenta.razon_social,
        cuit: `30-${n}${n.slice(0, 2)}-${n.at(-1)}`, localidad: process.env.LOCALIDAD || 'Mercedes', telefono: '2324 431234',
        condiciones: true,
    });
    if (r.status !== 201) throw new Error(`No se pudo pedir el alta: ${r.status} ${r.datos?.mensaje ?? ''} ${JSON.stringify(r.datos?.errores ?? '')}`);
    const id = r.datos.solicitud.usuario_id;
    // Se guarda antes de aprobar: si la aprobación falla, al volver a correr no se crea otra cuenta
    await guardarCuenta(ARCHIVO, { ...cuenta, usuario_id: id });
    console.log(`✔ solicitud #${id} ${cuenta.razon_social} <${cuenta.email}>`);
    await aprobar(id, false);
    return cuenta;
}

// El admin aprueba la solicitud; con siYaEstaba, un 409 (ya resuelta) no es error
async function aprobar(id, siYaEstaba) {
    const admin = sesion();
    const datosAdmin = (await leerCuenta('.usuarios.json', 'Falta tests/e2e/abm/.usuarios.json.')).admin;
    await admin.ingresar(datosAdmin.email, datosAdmin.password, 'el admin');
    const a = await admin.api('PATCH', `/api/admin/solicitudes-empresa/${id}`, { aprobar: true });
    if (a.status === 409 && siYaEstaba) return;
    if (a.status !== 200) throw new Error(`El admin no pudo aprobarla: ${a.status} ${a.datos?.mensaje ?? ''}`);
    console.log(`✔ aprobada por el admin (cuenta guardada en tests/e2e/abm/${ARCHIVO})`);
}

async function main() {
    noEnProduccionSinQuerer();
    console.log(`Front: ${BASE}`);
    if (!args.includes('--borrar')) await asegurarCuenta();
    await publicar({
        cuenta: ARCHIVO, autos: AUTOS, localidad: process.env.LOCALIDAD || 'Mercedes', fotosDir: FOTOS,
        aprobar: !args.includes('--borrar'), borrar: args.includes('--borrar'),
    });
}

main().catch((e) => { console.error('✘', e.message); process.exit(1); });
