// Inspecciones (el mecánico que firma): nombres para mostrar y las reglas que el front revisa antes de mandar.
// Son copia de las del back (AutoCarBackend/src/Inspecciones: Checklist, Estados y Precio). El back vuelve a
// validar todo; acá sólo se evita mandar algo que ya sabemos que está mal y se muestra el desglose del precio.

// Los mismos códigos y el mismo orden que Inspecciones\Checklist::ITEMS
export const CHECKLIST = [
    { codigo: 'carroceria', nombre: 'Carrocería', detalle: 'Pintura y golpes' },
    { codigo: 'estructura', nombre: 'Estructura', detalle: 'Chasis, largueros y rastros de choque' },
    { codigo: 'motor', nombre: 'Motor', detalle: 'Pérdidas y ruidos' },
    { codigo: 'transmision', nombre: 'Transmisión', detalle: 'Caja y embrague' },
    { codigo: 'frenos', nombre: 'Frenos', detalle: 'Pastillas, discos, líquido y freno de mano' },
    { codigo: 'suspension', nombre: 'Suspensión', detalle: 'Tren delantero y amortiguadores' },
    { codigo: 'neumaticos', nombre: 'Neumáticos', detalle: 'Desgaste parejo y estado de las cubiertas' },
    { codigo: 'electricidad', nombre: 'Electricidad', detalle: 'Tablero, luces y testigos' },
    { codigo: 'kilometraje', nombre: 'Kilometraje', detalle: 'Desgaste coherente con los km' },
    { codigo: 'identificacion', nombre: 'Identificación', detalle: 'Motor y chasis coinciden con la cédula' },
];

export const RESULTADOS = { ok: 'OK', observado: 'Observado', falla: 'Falla' };
export const CONCLUSIONES = {
    recomendable: 'Recomendable',
    con_reparos: 'Con reparos',
    no_recomendable: 'No recomendable',
};
export const ESTADOS = {
    pedida: 'Pedida',
    aceptada: 'Aceptada',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada',
    firmada: 'Firmada',
    no_realizada: 'No se pudo hacer',
    caida: 'Se cayó: el auto se vendió',
};
export const FUENTES = {
    mercadolibre: 'MercadoLibre',
    kavak: 'Kavak',
    autocosmos: 'Autocosmos',
    autocar: 'AutoCar',
    otro: 'Otro sitio',
};

export const MAX_NOTA = 300;
export const MAX_RESUMEN = 1000;
export const MAX_MOTIVO = 300;

export const nombreItem = (codigo) => CHECKLIST.find((i) => i.codigo === codigo)?.nombre || codigo;
export const resultado = (valor) => RESULTADOS[valor] || valor;
export const conclusion = (valor) => CONCLUSIONES[valor] || valor;
export const estado = (valor) => ESTADOS[valor] || valor;
export const fuente = (valor) => FUENTES[valor] || valor;

// De qué sitio es un link, para mostrarlo mientras el comprador lo pega (el back lo vuelve a decidir con
// Inspecciones\Fuente). Devuelve null si no es un link http(s).
const DOMINIOS = { 'mercadolibre.com.ar': 'mercadolibre', 'kavak.com': 'kavak', 'autocosmos.com.ar': 'autocosmos' };
export function fuenteDeUrl(texto, hostPropio = '') {
    let url;
    try {
        url = new URL(String(texto).trim());
    } catch {
        return null;
    }
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    const dominio = Object.keys(DOMINIOS).find((d) => host === d || host.endsWith(`.${d}`));
    if (dominio) return DOMINIOS[dominio];
    if (hostPropio && host === hostPropio.toLowerCase() && url.pathname.endsWith('vehiculo.html')) return 'autocar';
    return 'otro';
}

// Experiencia del mecánico (el ranking es por inspecciones firmadas): "12 inspecciones firmadas" o
// "Nuevo en la red · 1 inspección firmada" si todavía no llega al mínimo.
export function experiencia(m) {
    const firmadas = m.firmadas === 1 ? '1 inspección firmada' : `${m.firmadas} inspecciones firmadas`;
    return m.nuevo ? `Nuevo en la red · ${firmadas}` : firmadas;
}

// Qué tiene que pedir el comprador antes de pagar el auto (los papeles no los revisa el mecánico).
// Cada link va a la página del trámite (revisados el 15/11/2026). Patentes y VTV son de Provincia de Buenos Aires:
// si el auto está radicado en otra provincia, se piden en la de ahí.
export const TRAMITES = [
    { nombre: 'Informe de dominio', detalle: 'Prendas, embargos, denuncia de robo e inhibiciones. Se pide con la patente',
        url: 'https://www.argentina.gob.ar/servicio/solicitar-un-informe-de-dominio-del-automotor' },
    { nombre: 'Libre deuda de patentes', detalle: 'En ARBA: elegí "Automotor" y poné la patente',
        url: 'https://www.arba.gov.ar/Aplicaciones/AvisoDeudas.asp' },
    { nombre: 'VTV vigente', detalle: 'Verificación técnica vehicular de Provincia de Buenos Aires',
        url: 'https://www.vtv.gba.gob.ar/' },
    { nombre: 'Formulario 08 firmado', detalle: 'Para la transferencia, con la firma del titular certificada',
        url: 'https://www.argentina.gob.ar/tramitar-en-linea-formulario-08-para-transferencia-automotor' },
];

// Título del auto: el que vino con el pedido o, si el comprador no lo cargó, el sitio.
export const tituloAuto = (inspeccion) =>
    inspeccion.titulo || `Auto de ${fuente(inspeccion.fuente)}`;

// Igual que Inspecciones\Precio::desglose: AutoCar se queda su comisión (redondeada a miles) y el resto es del
// mecánico. La comisión es un parámetro que cambia el admin: p = lo que devuelve GET /api/parametros
// ({comision_autocar, ...}, 23 = 23 %). Con $ 100.000 y 23 %: 77.000 / 23.000.
const redondear = (monto) => Math.round(monto / 1000) * 1000;

export function desglose(precio, p) {
    const autocar = Math.min(precio, redondear(precio * p.comision_autocar / 100));
    return { precio, monto_mecanico: precio - autocar, monto_autocar: autocar };
}

// Patente: igual que Inspecciones\Patente. Sin espacios, guiones ni puntos y en mayúsculas; vieja (ABC123) o
// Mercosur (AB123CD). normalizarPatente devuelve null si no tiene un formato argentino.
export function normalizarPatente(texto) {
    const limpia = String(texto || '').replace(/[\s.-]/g, '').toUpperCase();
    return /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(limpia) ? limpia : null;
}

// Para mostrar: "AB 123 CD" o "ABC 123".
export function formatoPatente(patente) {
    if (!patente) return '';
    return patente.length === 7
        ? `${patente.slice(0, 2)} ${patente.slice(2, 5)} ${patente.slice(5)}`
        : `${patente.slice(0, 3)} ${patente.slice(3)}`;
}

// Cuántos ítems del checklist ya tienen resultado.
export const completos = (items) => items.filter((i) => RESULTADOS[i.resultado]).length;

// Revisa el informe como Inspecciones\Checklist. items: [{codigo, resultado, nota}].
// Con completo = true (para firmar) exige los 10 ítems y la conclusión.
// Devuelve {errores: {campo: mensaje}, mensaje}: los campos son los name del formulario
// (resultado-<codigo>, nota-<codigo>, conclusion, resumen). Sin errores, mensaje es ''.
export function validarInforme({ items, conclusion: concl, resumen = '' }, completo) {
    const errores = {};
    items.forEach(({ codigo, resultado: res, nota = '' }) => {
        const texto = nota.trim();
        if (!res) {
            if (completo) errores[`resultado-${codigo}`] = 'Elegí un resultado.';
            return;
        }
        if (texto.length > MAX_NOTA) errores[`nota-${codigo}`] = `Puede tener hasta ${MAX_NOTA} caracteres.`;
        else if (res !== 'ok' && !texto) errores[`nota-${codigo}`] = 'Explicá qué encontraste.';
    });
    if (completo && !CONCLUSIONES[concl]) errores.conclusion = 'Elegí una conclusión.';
    if (resumen.trim().length > MAX_RESUMEN) errores.resumen = `Puede tener hasta ${MAX_RESUMEN} caracteres.`;

    const cantidad = Object.keys(errores).length;
    let mensaje = '';
    if (cantidad) mensaje = completo ? 'Para firmar falta completar o corregir lo marcado.' : 'Revisá los datos marcados.';
    return { errores, mensaje };
}

// Lo que se manda al back: sólo los ítems con resultado (mientras no firma puede guardar a medias).
export function cuerpoInforme({ items, conclusion: concl, resumen = '', patente = '', marca = '', modelo = '' }) {
    return {
        marca: marca || null,
        modelo: modelo || null,
        items: items
            .filter((i) => i.resultado)
            .map(({ codigo, resultado: res, nota = '' }) => ({ codigo, resultado: res, nota: nota.trim() })),
        conclusion: concl || null,
        resumen: resumen.trim(),
        patente: patente.trim(),
    };
}

// Crédito del comprador cuando el auto se vendió (ver AutoVendido en el back)
export const CREDITOS = {
    auto_vendido: 'el auto se vendió antes de la firma',
    cupon: 'el auto se vendió enseguida después de la firma, con el turno confirmado',
};

// Idea A: los ítems que se arreglan en un taller (kilometraje e identificación se revisan, pero no tienen arreglo)
export const ARREGLABLES = ['carroceria', 'estructura', 'motor', 'transmision', 'frenos', 'suspension', 'neumaticos', 'electricidad'];

// Idea B: de dónde sale cada falla típica y en qué estado quedó con los votos de los mecánicos
export const ORIGENES_FALLA = { internet: 'De internet', mecanicos: 'De los mecánicos', medido: 'Medido en inspecciones' };
export const ESTADOS_FALLA = { confirmada: 'Confirmada', sin_confirmar: 'Sin confirmar', descartada: 'Descartada' };

// Alcance de la inspección (N3): qué revisa el mecánico y qué no. Se muestra antes de pagar y en el informe.
// "Cubre" sale del checklist; lo demás queda escrito acá y en modelo-de-negocio/PLAN.md (sección 7).
export const ALCANCE = {
    cubre: () => CHECKLIST.map((c) => `${c.nombre}: ${c.detalle.toLowerCase()}`),
    noCubre: [
        'Lo que sólo se ve desarmando: el interior del motor o de la caja.',
        'Fallas intermitentes que no aparecen el día de la revisión.',
        'Lo que se rompa o se desgaste después de la inspección.',
        'Los papeles: deudas de patente, multas, prendas o inhibiciones. Te decimos qué trámites pedir.',
        'Si el precio del aviso es justo.',
    ],
};

// El informe reduce el riesgo, no lo elimina: no hay reclamo después de la firma (se sacó el 23/11).
export const TEXTO_RIESGO = 'El informe te dice cómo está el auto el día de la revisión: reduce el riesgo, pero no '
    + 'lo elimina. La decisión de comprar es tuya y no hay reclamo después de la firma.';
