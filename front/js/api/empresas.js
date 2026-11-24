// Empresas (concesionarias): "Sumá tu concesionaria", la vitrina pública y el panel de la empresa con sesión.
import { get, post } from './cliente.js';

// datos: {responsable, email, password, razon_social, cuit, localidad, telefono, sitio_web?, condiciones: true}
// → {solicitud} (201, queda pendiente hasta que la aprueba un admin)
export const enviarSolicitud = (datos) => post('/api/solicitudes-empresa', datos);

// → {empresa: {id, nombre, localidad, telefono, sitio_web, desde}, vehiculos: [...]}
export const vitrina = (id) => get(`/api/empresas/${encodeURIComponent(id)}`);

// dias: 7, 30 o 90 → {empresa, dias, resumen, mas_vista, serie: [{fecha, visitas}], autos: [...]}
export const panel = (dias) => get('/api/empresa/panel', { dias });
