// El total de ingresos usa cobros del período. Las liquidaciones mensuales incluyen también los pendientes.
export const FUENTES = {
    inspecciones: ['Inspecciones', 'Comisión de AutoCar menos los créditos usados'],
    clics: ['Clics a plataformas', 'Liquidaciones por clics cobradas en el período'],
    abonos: ['Afiliaciones de concesionarias', 'Abonos mensuales cobrados en el período'],
};

export function ingresosElegidos(datos, fuentes) {
    if (fuentes.size === Object.keys(FUENTES).length) return datos.ingresos;
    let importe = 0;
    for (const fuente of fuentes) {
        const valor = datos['ingresos_' + fuente];
        if (valor == null) return undefined;
        importe += valor;
    }
    return importe;
}

export function liquidacionElegida(mes, fuentes) {
    if (fuentes.has('clics') && fuentes.has('abonos')) return mes;
    const conClics = fuentes.has('clics');
    const filas = mes.filas.filter(f => f.tipo === (conClics ? 'plataforma' : 'empresa'));
    const deClics = conClics ? mes.de_clics : 0;
    const deAbonos = conClics ? 0 : mes.de_abonos;
    const pendiente = filas.some(f => f.monto > 0 && !f.cobrado_at);
    return { ...mes, filas, total: deClics + deAbonos, de_clics: deClics, de_abonos: deAbonos,
        clics: conClics ? mes.clics : 0, validos: conClics ? mes.validos : 0,
        estado: mes.en_curso ? 'en_curso' : (pendiente ? 'pendiente' : 'cobrado') };
}
