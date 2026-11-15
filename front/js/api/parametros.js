// Parámetros del negocio (los cambia el admin en admin-parametros.html, sin tocar código).
import { get, put } from './cliente.js';

// Público. → {comision_autocar, parte_fondo, tope_veces, dias_reclamo, precio_minimo, precio_sugerido, precio_maximo}
export const publicos = () => get('/api/parametros');

// Admin (permiso parametros.editar). → {parametros: [{clave, valor, minimo, maximo, unidad, descripcion,
// updated_at, cambiado_por}], cambios: [{clave, valor_anterior, valor_nuevo, fecha, usuario}]}
export const todos = () => get('/api/admin/parametros');

// valores: {clave: valor}, solo los que cambian. → lo mismo que todos()
export const guardar = (valores) => put('/api/admin/parametros', { valores });
