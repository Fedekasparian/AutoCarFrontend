// Vitrina de una concesionaria (empresa.html?id=N) con GET /api/empresas/{id}: sus datos públicos (nunca el email)
// y todos sus autos publicados, con las mismas fichas que Explorar.
import * as empresas from '../api/empresas.js';
import * as corazones from '../servicios/corazones.js';
import * as formato from '../servicios/formato.js';
import * as vistas from '../servicios/vistas.js';
import { filasDatos } from '../servicios/informe.js';
import { ruta } from '../servicios/rutas.js';

const { el } = vistas;
const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(window.location.search).get('id');

async function cargar() {
    if (!/^\d+$/.test(id || '')) {
        $('estado').replaceChildren(vistas.aviso('No encontramos esa concesionaria.'));
        return;
    }
    $('estado').replaceChildren(vistas.cargando());
    try {
        const { empresa: e, vehiculos } = await empresas.vitrina(id);
        $('titulo').textContent = e.nombre;
        document.title = `${e.nombre} - AutoCar`;
        $('vitrina-datos').replaceChildren(...filasDatos([
            ['Localidad', e.localidad],
            ['Teléfono', e.telefono],
            e.sitio_web ? ['Sitio web', el('a', { href: e.sitio_web, target: '_blank', rel: 'noopener noreferrer' }, e.sitio_web.replace(/^https?:\/\//, ''))] : null,
            ['En AutoCar desde', formato.fecha(e.desde)],
        ]));
        $('vitrina').hidden = false;
        $('vitrina-cantidad').textContent = vehiculos.length === 1 ? '1 auto publicado' : `${vehiculos.length} autos publicados`;
        $('vitrina-cantidad').hidden = false;
        const fichas = vehiculos.map(vistas.fichaVehiculo);
        fichas.forEach((li, i) => li.style.setProperty('--n', String(i)));
        $('resultados').replaceChildren(...fichas);
        $('resultados').classList.add('grilla-vehiculos--entra');
        corazones.poner($('resultados'), vehiculos);
        $('estado').replaceChildren(vehiculos.length ? '' : vistas.aviso('Esta concesionaria no tiene autos publicados ahora.', null,
            el('a', { class: 'boton boton--secundario', href: ruta('home.html') }, 'Ver todos los autos')));
    } catch (error) {
        $('estado').replaceChildren(error.status === 404 ? vistas.aviso('No encontramos esa concesionaria.') : vistas.avisoDeError(error));
    }
}

cargar();
