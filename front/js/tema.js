// Comparación local de identidad. No necesita librerías y no cambia datos del usuario.
(() => {
    const temas = ['petroleo', 'mandarina', 'aqua', 'durazno'];
    const solicitado = new URLSearchParams(location.search).get('tema');
    let guardado;
    try { guardado = localStorage.getItem('autocar-tema'); } catch { /* Preferencia opcional. */ }
    const tema = temas.includes(solicitado) ? solicitado : temas.includes(guardado) ? guardado : 'aqua';
    document.documentElement.dataset.tema = tema;
    if (temas.includes(solicitado)) {
        try { localStorage.setItem('autocar-tema', tema); } catch { /* Funciona sin almacenamiento. */ }
    }
})();

// Modo claro u oscuro: <html data-modo="claro|oscuro">, que es lo que mira base-visual.css. Si el usuario lo
// eligió con el botón (navegacion.js) queda guardado; si no, se sigue el del sistema, también si cambia
// con la página abierta. Va acá, en el <head>, para que la página no aparezca un instante en el otro modo.
window.modoAutoCar = (() => {
    const raiz = document.documentElement;
    const sistema = matchMedia('(prefers-color-scheme: dark)');
    let elegido = null;
    try { elegido = localStorage.getItem('autocar-modo'); } catch { /* Preferencia opcional. */ }
    if (!['claro', 'oscuro'].includes(elegido)) elegido = null;
    let fundido;

    const aplicar = () => { raiz.dataset.modo = elegido ?? (sistema.matches ? 'oscuro' : 'claro'); };
    aplicar();
    sistema.addEventListener('change', aplicar);

    return {
        actual: () => raiz.dataset.modo,
        // Pasa al otro modo y lo recuerda en este navegador. Con la clase modo-cambiando los colores se funden en
        // 200 ms (ver base-visual.css); solo al tocar el botón, no al abrir la página
        cambiar() {
            elegido = raiz.dataset.modo === 'oscuro' ? 'claro' : 'oscuro';
            try { localStorage.setItem('autocar-modo', elegido); } catch { /* Vale solo para esta página. */ }
            raiz.classList.add('modo-cambiando');
            clearTimeout(fundido);
            fundido = setTimeout(() => raiz.classList.remove('modo-cambiando'), 250);
            aplicar();
            document.dispatchEvent(new CustomEvent('autocar:modo'));
        },
    };
})();

// Transición suave entre páginas. Solo en Chromium (navigator.userAgentData existe solo ahí): el WebKit de las
// pruebas E2E se colgaba al navegar con ella activa, y Firefox todavía no la soporta. Con "menos movimiento", nada.
if (navigator.userAgentData) {
    // La Content-Security-Policy (vercel.json) permite este <style> por su hash sha256: si se cambia el texto
    // de abajo hay que recalcularlo, o el navegador lo bloquea (el sitio anda igual, sin la transición).
    const transicion = document.createElement('style');
    transicion.textContent = '@media (prefers-reduced-motion: no-preference){ @view-transition{ navigation: auto; } }';
    document.head.append(transicion);
}
