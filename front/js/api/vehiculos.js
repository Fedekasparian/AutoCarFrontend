// Rutas públicas del catálogo.
import { get } from './cliente.js';

// filtros: {q, zona, marca, combustible, precio_max, vendedor: particular|empresa, orden: relevantes|recientes, page}
// → {items (cada uno con empresa: {id, nombre} o null), total, pagina, por_pagina, paginas}
export const listar = (filtros) => get('/api/vehiculos', filtros);

// → {vehiculo}
export const detalle = (id) => get(`/api/vehiculos/${encodeURIComponent(id)}`);

// → {vehiculo_id, comparacion: {etiqueta: buen_precio|en_precio|caro|sin_datos, texto, ...}} (frente a otros sitios)
export const comparacion = (vehiculoId) => get(`/api/vehiculos/${encodeURIComponent(vehiculoId)}/comparacion`);

// → {marcas: ['Ford', 'Toyota', ...]}: las que tienen autos publicados (para el filtro del catálogo)
export const marcas = () => get('/api/marcas');

// → {empresas: [{id, nombre, autos}]}: las concesionarias con autos publicados (para el filtro de Explorar)
export const empresas = () => get('/api/empresas');

export const zonas =(zona) => get('/api/zonas', { zona });

// → {marcas: [{marca: 'Ford', modelos: ['Fiesta', 'Focus', ...]}, ...]}: las que se pueden publicar
export const marcasModelos = () => get('/api/marcas-modelos');
