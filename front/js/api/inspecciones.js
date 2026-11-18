// Inspecciones: el ranking público, el lado del comprador y el del mecánico (permiso verificaciones.realizar).
// Cada uno ve sólo sus inspecciones: el back responde 404 si la inspección es de otro.
//
// Una inspección llega así:
// {id, estado: pedida|aceptada|rechazada|cancelada|firmada|no_realizada|caida, fuente, url, vehiculo_id, titulo, anio, kilometraje,
//  precio_publicado, localidad, fecha_turno, motivo_rechazo, precio, monto_mecanico, monto_autocar, monto_fondo,
//  tope_veces, dias_reclamo (con los que se pidió),
//  pago: retenido|liberado|reembolsado, conclusion, resumen, firmado_por, taller_firma, firmada_at, huella,
//  created_at, comprador: {id, nombre}, mecanico: {id, nombre, taller, direccion, localidad},
//  reclamo: null | {id, estado: abierto|procede|no_procede, item_codigo, descripcion, compensacion, respuesta, ...},
//  reclamo_hasta, puede_reclamar, patente, patente_foto (ruta de la foto de la chapa o null),
//  turno_confirmado_at (el vendedor confirmó el turno), credito_usado, a_pagar, credito: null | {tipo, monto},
//  marca, modelo, modelo_clave, presupuestos y costo_total (idea A, sólo firmada y en el detalle),
//  items: [{codigo, resultado, nota, foto (ruta de la foto del ítem o null)}]}   (items sólo en el detalle)
import { get, post, put, patch } from './cliente.js';

const id = (n) => encodeURIComponent(n);

// ---------- Público y comprador ----------

// Ranking de la red → {items: [{id, mecanico, taller, direccion, localidad, precio_inspeccion, desglose,
// firmadas, reclamos_procedentes, puntaje, nuevo}], localidades}
export const mecanicos = (localidad) => get('/api/mecanicos', { localidad });

// {url, mecanico_id, titulo?, anio?, kilometraje?, precio_publicado?, localidad?, marca?, modelo?} → {inspeccion} (201)
export const pedir = (pedido) => post('/api/inspecciones', pedido);

// → {items: [inspeccion]}: las que pidió el usuario
export const mias = () => get('/api/mis-inspecciones');

// Sólo antes de que el mecánico la acepte. → {inspeccion}
export const cancelar = (n) => post(`/api/inspecciones/${id(n)}/cancelar`, {});

// Una vez, dentro de los días de reclamo de la inspección (dias_reclamo). {descripcion, item_codigo?} → {inspeccion} (201)
export const reclamar = (n, reclamo) => post(`/api/inspecciones/${id(n)}/reclamo`, reclamo);

// ---------- Mecánico ----------

// → {taller: {nombre, direccion, localidad, telefono, precio_inspeccion, activo} | null}
export const perfil = () => get('/api/mecanico/perfil');

// {nombre, direccion, localidad, telefono, precio_inspeccion} → {taller}
export const guardarPerfil = (datos) => put('/api/mecanico/perfil', datos);

// Bandeja por estado → {items: [inspeccion], conteos: {pedida, aceptada, firmada, ...}}
export const bandeja = (estado) => get('/api/mecanico/inspecciones', { estado });

// Detalle con el checklist. Lo ven el comprador, el mecánico asignado y el admin. → {inspeccion}
export const detalle = (n) => get(`/api/inspecciones/${id(n)}`);

// Sólo desde "pedida". Aceptar pide la fecha del turno (ISO 8601). → {inspeccion}
export const aceptar = (n, fechaTurno) =>
    patch(`/api/mecanico/inspecciones/${id(n)}`, { accion: 'aceptar', fecha_turno: fechaTurno });

// Rechazar pide el motivo; al comprador se le devuelve todo. → {inspeccion}
export const rechazar = (n, motivo) =>
    patch(`/api/mecanico/inspecciones/${id(n)}`, { accion: 'rechazar', motivo });

// Sólo desde "aceptada": fue y no la pudo hacer (por ejemplo, el vendedor no dejó revisar el auto).
// Pide el motivo; al comprador se le devuelve todo. → {inspeccion}
export const noRealizada = (n, motivo) =>
    patch(`/api/mecanico/inspecciones/${id(n)}`, { accion: 'no_realizada', motivo });

// Guarda el checklist (se puede a medias) mientras no esté firmada. {items, conclusion, resumen, patente, marca, modelo} → {inspeccion}
export const guardarInforme = (n, informe) => put(`/api/mecanico/inspecciones/${id(n)}/informe`, informe);

// Firma lo guardado: exige los 10 ítems, la conclusión, la patente con su foto, una foto de cada falla y la marca y el modelo.
// Después, cualquier cambio da 409. → {inspeccion}
export const firmar = (n) => post(`/api/mecanico/inspecciones/${id(n)}/firma`, {});

// Foto de la chapa. formulario: FormData con el campo "foto". → {inspeccion}
export const subirFotoPatente = (n, formulario) => post(`/api/mecanico/inspecciones/${id(n)}/patente-foto`, formulario);
// Foto de un ítem del checklist (obligatoria para firmar si tiene falla). formulario: FormData con "codigo" y "foto". → {inspeccion}
export const subirFotoItem = (n, formulario) => post(`/api/mecanico/inspecciones/${id(n)}/item-foto`, formulario);


// ---------- "Adherí tu taller" ----------
// La solicitud llega así: {usuario_id, responsable, email, rol, taller, cuit, direccion, localidad, telefono, horarios,
//  precio_inspeccion, estado: pendiente|aprobado|rechazado, motivo_rechazo, creada, resuelta, resuelta_por}

// Sin sesión: crea la cuenta del taller (aparte de la personal) y la solicitud pendiente.
// {responsable, email, password, nombre, cuit, direccion, localidad, telefono, horarios, precio_inspeccion,
//  condiciones: true} → {solicitud} (201). Email con cuenta → 422; solicitud pendiente con ese email → 409.
export const enviarSolicitud = (datos) => post('/api/solicitudes-taller', datos);

// ---------- Auto vendido (solo autos de AutoCar) ----------

// Los turnos de inspección de mis publicaciones, para confirmarlos. No dice qué mecánico es.
// → {items: [{id, vehiculo_id, titulo, fecha_turno, confirmado_at, taller_localidad}]}
export const turnosVendedor = () => get('/api/mis-vehiculos/turnos');

// El vendedor confirma el turno. Si vende el auto antes, el turno se cae solo y al comprador se le devuelve todo. → {turno}
export const confirmarTurno = (n) => post(`/api/inspecciones/${id(n)}/confirmar-turno`, {});

// Créditos del comprador que todavía no usó (un auto anterior se vendió); se descuentan solos al pedir.
// → {items: [{id, tipo: auto_vendido|cupon, monto, created_at, inspeccion_id, titulo}], total}
export const creditos = () => get('/api/mis-creditos');

// ---------- Idea A: costo total con presupuestos de otros talleres ----------

// El comprador pide los presupuestos de un informe firmado antes de que existieran (los nuevos se piden solos). → {inspeccion}
export const pedirPresupuestos = (n) => post(`/api/inspecciones/${id(n)}/presupuestos`, {});

// Lo que le pidieron presupuestar a este taller → {items: [{id, inspeccion_id, item_codigo, estado, monto, detalle,
//  vigente_hasta, auto: {titulo, anio, kilometraje, localidad}, item: {resultado, nota}}]}
export const presupuestosDelTaller = (estado) => get('/api/mecanico/presupuestos', { estado });

// {monto, detalle} o {rechazar: true}, una sola vez → {presupuesto}
export const responderPresupuesto = (n, respuesta) => patch(`/api/mecanico/presupuestos/${id(n)}`, respuesta);

// ---------- Idea B: fallas típicas por modelo ----------
// Llegan así: {marca, modelo, clave, inspecciones, minimo, medido, fallas: [{id, item_codigo, titulo, descripcion,
//  origen: internet|mecanicos, fuente_url, estado: confirmada|sin_confirmar|descartada, votos: {confirman, descartan},
//  porcentaje (null con menos del mínimo), mi_voto (solo el mecánico)}], medidas: [{item_codigo, porcentaje}]}

// Público: sin las descartadas → {fallas_tipicas}
export const fallasTipicas = (marca, modelo) => get('/api/fallas-tipicas', { marca, modelo });

// Mecánico: con las descartadas y su voto → {fallas_tipicas}
export const fallasDelMecanico = (marca, modelo) => get('/api/mecanico/fallas-tipicas', { marca, modelo });

// {marca, modelo, item_codigo, titulo, descripcion?} → {id, fallas_tipicas} (201)
export const proponerFalla = (falla) => post('/api/mecanico/fallas-tipicas', falla);

// La vio (true) o no es típica (false); lo puede cambiar → {fallas_tipicas}
export const votarFalla = (n, confirma) => put(`/api/mecanico/fallas-tipicas/${id(n)}/voto`, { confirma });

// Admin: una falla de internet, con la fuente obligatoria → {id, fallas_tipicas} (201)
export const cargarFallaInternet = (falla) => post('/api/admin/fallas-tipicas', falla);
