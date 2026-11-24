import { get } from '../api/cliente.js';
import { carrusel } from '../servicios/carrusel.js';
import { fichaVehiculo } from '../servicios/vistas.js';
import { poner } from '../servicios/corazones.js';
import * as sesion from '../servicios/sesion.js';
import * as favoritos from '../api/favoritos.js';

async function explorar() {
    // Una búsqueda o una página explícita conservan su grilla filtrada y paginada.
    if ([...new URLSearchParams(location.search).values()].some(Boolean)) return;
    const caja = document.getElementById('colecciones');
    const { filas } = await get('/api/explorar');
    if (!filas.length) return;
    let guardados = new Set();
    if (sesion.iniciada() && sesion.compraYVende()) {
        try { guardados = new Set((await favoritos.listar()).items.map(f => String(f.id))); } catch { /* permite reintentar al tocar */ }
    }
    filas.forEach(({ tipo, nombre, items }, i) => {
        if (!items.length) return;
        const titulo = tipo === 'localidad' ? 'Cerca tuyo en ' + nombre : tipo === 'empresa' ? nombre : 'Autos de ' + nombre;
        const seccion = carrusel(titulo, items.map(fichaVehiculo), { id: 'coleccion-' + i });
        caja.append(seccion);
        poner(seccion.querySelector('ul'), items, { guardados });
    });
    caja.hidden = !caja.childElementCount;
    document.getElementById('catalogo-titulo').hidden = caja.hidden;
}
// El catálogo paginado sigue disponible si el servidor todavía no ofrece colecciones.
explorar().catch(() => {});
