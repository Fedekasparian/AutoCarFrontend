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

// Transición suave entre páginas. Solo en Chromium (navigator.userAgentData existe solo ahí): el WebKit de las
// pruebas E2E se colgaba al navegar con ella activa, y Firefox todavía no la soporta. Con "menos movimiento", nada.
if (navigator.userAgentData) {
    // Un <link> y no un <style>: la Content-Security-Policy no permite estilos en línea
    const transicion = document.createElement('link');
    transicion.rel = 'stylesheet';
    transicion.href = new URL('../styles/transicion.css', document.currentScript.src).href;
    document.head.append(transicion);
}
