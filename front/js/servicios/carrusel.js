import { el } from './vistas.js';

// El desplazamiento es nativo: funciona con touch, trackpad, teclado y los controles del encabezado.
export function carrusel(titulo, fichas, { id, clase = '' } = {}) {
    const lista = el('ul', { class: 'carrusel__pista', id, role: 'list', tabindex: '0', 'aria-label': titulo }, ...fichas);
    function flecha(sentido, etiqueta) {
        const b = el('button', { type: 'button', class: 'carrusel__flecha', 'aria-label': etiqueta + ' · ' + titulo, 'aria-controls': id },
            el('span', { 'aria-hidden': 'true' }, sentido < 0 ? '‹' : '›'));
        b.addEventListener('click', () => {
            const paso = lista.children[1] ? lista.children[1].offsetLeft - lista.children[0].offsetLeft : lista.clientWidth;
            lista.scrollBy({ left: sentido * paso * Math.max(1, Math.floor((lista.clientWidth + 1) / paso)),
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        });
        return b;
    }
    const anterior = flecha(-1, 'Anteriores');
    const siguiente = flecha(1, 'Siguientes');
    const controles = el('div', { class: 'carrusel__controles', hidden: true }, anterior, siguiente);
    const actualizar = () => {
        const fin = lista.scrollWidth - lista.clientWidth;
        controles.hidden = fin <= 2;
        anterior.disabled = lista.scrollLeft <= 2;
        siguiente.disabled = lista.scrollLeft >= fin - 2;
        lista.tabIndex = controles.hidden ? -1 : 0;
    };
    lista.addEventListener('scroll', actualizar, { passive: true });
    new ResizeObserver(actualizar).observe(lista);
    return el('section', { class: 'carrusel ' + clase, 'aria-labelledby': id + '-titulo' },
        el('div', { class: 'carrusel__cabecera' }, el('h2', { id: id + '-titulo' }, titulo), controles), lista);
}
