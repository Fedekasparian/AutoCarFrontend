// Rutas de las páginas, siempre RELATIVAS a este archivo (nunca "/pages/..." desde la raíz del dominio).
// Así el sitio anda igual en la raíz de un dominio, en una subcarpeta (GitHub Pages) o abierto desde Live Server.
// Uso: window.location.assign(ruta('home.html')) o href: ruta('vehiculo.html?id=3').
// Si se agrega una página nueva, anotarla en PAGINAS.
const RAIZ = new URL('../../', import.meta.url);

const PAGINAS = {
    'index.html': 'index.html',
    'admin-metricas.html': 'pages/admin/admin-metricas.html',
    'admin-parametros.html': 'pages/admin/admin-parametros.html',
    'admin-fallas.html': 'pages/admin/admin-fallas.html',
    'admin-moderar.html': 'pages/admin/admin-moderar.html',
    'admin-reclamos.html': 'pages/admin/admin-reclamos.html',
    'admin-soporte.html': 'pages/admin/admin-soporte.html',
    'admin-talleres.html': 'pages/admin/admin-talleres.html',
    'admin-usuarios.html': 'pages/admin/admin-usuarios.html',
    'admin-vehiculos.html': 'pages/admin/admin-vehiculos.html',
    'admin.html': 'pages/admin/admin.html',
    'buscar.html': 'pages/vehiculos/buscar.html',
    'como-funciona.html': 'pages/info/como-funciona.html',
    'contacto.html': 'pages/info/contacto.html',
    'conversacion.html': 'pages/operaciones/conversacion.html',
    'cuenta.html': 'pages/auth/cuenta.html',
    'favoritos.html': 'pages/vehiculos/favoritos.html',
    'guia.html': 'pages/info/guia.html',
    'home.html': 'pages/info/home.html',
    'legales.html': 'pages/info/legales.html',
    'login.html': 'pages/auth/login.html',
    'mensajes.html': 'pages/operaciones/mensajes.html',
    'meta-busqueda-nueva.html': 'pages/operaciones/meta-busqueda-nueva.html',
    'meta-busqueda-resultados.html': 'pages/operaciones/meta-busqueda-resultados.html',
    'meta-busqueda-novedades.html': 'pages/operaciones/meta-busqueda-novedades.html',
    'meta-busqueda.html': 'pages/operaciones/meta-busqueda.html',
    'empresas-sumarse.html': 'pages/vehiculos/empresas-sumarse.html',
    'empresa.html': 'pages/vehiculos/empresa.html',
    'empresa-panel.html': 'pages/vehiculos/empresa-panel.html',
    'admin-empresas.html': 'pages/admin/admin-empresas.html',
    'mis-inspecciones.html': 'pages/talleres/mis-inspecciones.html',
    'mis-publicaciones.html': 'pages/vehiculos/mis-publicaciones.html',
    'pedir-inspeccion.html': 'pages/talleres/pedir-inspeccion.html',
    'preferencias.html': 'pages/auth/preferencias.html',
    'publicar.html': 'pages/vehiculos/publicar.html',
    'registro.html': 'pages/auth/registro.html',
    'reportar.html': 'pages/info/reportar.html',
    'taller-verificacion.html': 'pages/talleres/taller-verificacion.html',
    'taller.html': 'pages/talleres/taller.html',
    'talleres-adherirse.html': 'pages/talleres/talleres-adherirse.html',
    'talleres.html': 'pages/talleres/talleres.html',
    'vehiculo.html': 'pages/vehiculos/vehiculo.html',
    'verificacion.html': 'pages/talleres/verificacion.html',
};

// 'archivo.html?x=1#y' → URL completa de esa página; devuelve null si el archivo no existe en PAGINAS.
export function ruta(destino) {
    const [, archivo, resto = ''] = /^([^?#]*)(.*)$/.exec(destino);
    const nombre = archivo.split('/').pop();
    return PAGINAS[nombre] ? new URL(PAGINAS[nombre], RAIZ).href + resto : null;
}
