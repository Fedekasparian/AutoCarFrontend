// Navegación (script clásico, en todas las páginas, después de barra-admin.js):
// - la barra y la cabecera se achican y toman sombra al bajar (clase "con-scroll" en <html>);
// - en escritorio, una píldora se desliza al link que señala el mouse y vuelve al de la página actual.
// Sólo es visual: sin este script la navegación funciona igual.
(() => {
    const raiz = document.documentElement;

    // 0. Con sesión, el logo lleva a Explorar y no a la portada pública (la de "Ingresar" y "Crear cuenta").
    //    Se lee lo mismo que barra-admin.js: los datos públicos de la sesión en localStorage.
    //    El admin no tiene "Explorar" en su barra: su logo lleva a Moderar, su primera pestaña.
    let usuario = null;
    try {
        const guardada = JSON.parse(localStorage.getItem('autocar.sesion'));
        if (guardada?.usuario && !(guardada.vence && Date.now() > guardada.vence)) usuario = guardada.usuario;
    } catch {
        // Sin almacenamiento: no hay sesión que mirar.
    }
    // 0.a Una cuenta personal que todavía no contestó "¿Para qué buscás el auto?" (o no aceptó la política de
    //     privacidad) no puede seguir: encima de la página aparece el cartel con los cuatro perfiles
    //     (js/servicios/perfil.js) y no se va hasta que elige uno. Así todas quedan clasificadas.
    //     Legales se puede leer igual (ahí está la política).
    const pagina = window.location.pathname.split('/').pop();
    if (usuario && (usuario.preferencias_pendientes || usuario.privacidad_pendiente)
        && !['preferencias.html', 'legales.html', 'login.html'].includes(pagina)) {
        const modulo = new URL('servicios/perfil.js', document.currentScript.src).href;
        import(modulo).then(({ pedirPerfil }) => pedirPerfil(usuario));
    }
    if (usuario) {
        const [ruta, etiqueta] = usuario.rol === 'admin'
            ? ['../pages/admin/admin-moderar.html', 'AutoCar, moderar publicaciones']
            : ['../pages/info/home.html', 'AutoCar, explorar vehículos'];
        const destino = new URL(ruta, document.currentScript.src).href;
        document.querySelectorAll('a.marca, a.barra__marca').forEach((logo) => {
            if (/\/index\.html$|\/front\/?$/.test(new URL(logo.href).pathname)) {
                logo.href = destino;
                logo.setAttribute('aria-label', etiqueta);
            }
        });
    }

    // 1. Barra compacta al bajar.
    //    Con un solo umbral la barra temblaba: al achicarse, la página sube 16 px, el scroll vuelve a cruzar
    //    el umbral y la barra se agranda otra vez, en un ciclo. Con dos umbrales separados (se achica pasando
    //    los 80 px y se agranda recién por debajo de los 16) ese cambio de alto ya no la hace cambiar de estado.
    let pendiente = false;
    const revisarScroll = () => {
        pendiente = false;
        const y = window.scrollY;
        if (y > 80) raiz.classList.add('con-scroll');
        else if (y < 16) raiz.classList.remove('con-scroll');
    };
    window.addEventListener('scroll', () => {
        if (!pendiente) { pendiente = true; requestAnimationFrame(revisarScroll); }
    }, { passive: true });
    revisarScroll();

    // 1.b La flecha de volver de la cabecera: si llegaste desde otra página del sitio, vuelve ahí (como el botón
    //     del navegador). Así el mecánico que abre el aviso desde una inspección vuelve a la inspección y no a
    //     Explorar. El href del HTML queda para cuando la página se abre directo (link compartido, pestaña nueva).
    //     No se vuelve a un formulario ya enviado ni al ingreso.
    const volver = document.querySelector('.encabezado__volver');
    if (volver) {
        volver.addEventListener('click', (evento) => {
            let anterior = null;
            try { anterior = document.referrer ? new URL(document.referrer) : null; } catch { anterior = null; }
            const sirve = anterior && anterior.origin === window.location.origin
                && anterior.pathname !== window.location.pathname
                && !/\/(login|registro|preferencias|publicar)\.html$/.test(anterior.pathname);
            if (sirve && window.history.length > 1) {
                evento.preventDefault();
                window.history.back();
            }
        });
    }

    // 1.c Botón de modo claro / oscuro (la lógica está en tema.js). Va al final de la barra en escritorio y de la
    //     cabecera de las páginas públicas; en celular, con la barra de pestañas abajo, está en Cuenta.
    const ns = 'http://www.w3.org/2000/svg';
    const ICONOS = {
        // Luna para pasar a oscuro, sol para pasar a claro
        claro: ['M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z'],
        oscuro: ['M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
            'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'],
    };
    function botonModo() {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'boton-modo';
        const pintar = () => {
            const modo = window.modoAutoCar?.actual() ?? 'claro';
            const texto = modo === 'oscuro' ? 'Pasar a modo claro' : 'Pasar a modo oscuro';
            boton.setAttribute('aria-label', texto);
            boton.title = texto;
            const svg = document.createElementNS(ns, 'svg');
            Object.entries({ width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
                'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })
                .forEach(([k, v]) => svg.setAttribute(k, v));
            ICONOS[modo].forEach((d) => {
                const path = document.createElementNS(ns, 'path');
                path.setAttribute('d', d);
                svg.append(path);
            });
            boton.replaceChildren(svg);
        };
        pintar();
        boton.addEventListener('click', () => window.modoAutoCar?.cambiar());
        document.addEventListener('autocar:modo', pintar);
        return boton;
    }
    if (window.modoAutoCar) {
        document.querySelectorAll('.barra, .marca-nav').forEach((lugar) => lugar.append(botonModo()));
    }

    // 2. Píldora que se desliza entre los links de la barra (solo escritorio: en celular la barra es de pestañas)
    const lista = document.querySelector('.barra__lista');
    if (!lista) return;
    const escritorio = matchMedia('(min-width: 1100px)');
    const pildora = document.createElement('span');
    pildora.className = 'barra__pildora';
    pildora.setAttribute('aria-hidden', 'true');
    const barra = lista.closest(".barra") ?? lista.parentElement; // fuera de la lista: un <ul> solo lleva <li>
    barra.prepend(pildora);
    barra.classList.add("barra--con-pildora");

    const actual = () => lista.querySelector('.barra__enlace[aria-current="page"]');
    function moverA(enlace, animar = true) {
        if (!enlace || !escritorio.matches) { pildora.style.opacity = '0'; return; }
        const caja = barra.getBoundingClientRect();
        const destino = enlace.getBoundingClientRect();
        pildora.classList.toggle('barra__pildora--quieta', !animar);
        pildora.style.width = `${destino.width}px`;
        pildora.style.height = `${destino.height}px`;
        pildora.style.transform = `translate(${destino.left - caja.left}px, -50%)`; // centrada en alto: sigue bien aunque la barra se achique
        pildora.style.opacity = '1';
        pildora.classList.toggle('barra__pildora--hover', enlace !== actual());
    }

    lista.addEventListener('pointerover', (e) => {
        const enlace = e.target.closest('.barra__enlace');
        if (enlace) moverA(enlace);
    });
    lista.addEventListener('pointerleave', () => moverA(actual()));
    lista.addEventListener('focusin', (e) => {
        const enlace = e.target.closest('.barra__enlace');
        if (enlace) moverA(enlace);
    });
    lista.addEventListener('focusout', () => moverA(actual()));

    // Posición inicial sin animación (la fuente puede cambiar el ancho de los links al cargar)
    const ubicar = () => moverA(actual(), false);
    ubicar();
    document.fonts?.ready.then(ubicar);
    window.addEventListener('resize', ubicar);
    escritorio.addEventListener?.('change', ubicar);
})();
