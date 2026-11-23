// Barra de navegación según el rol. Es un script clásico (como tema.js) para cargarlo igual en todas las páginas.
// Sólo muestra u oculta: el back vuelve a controlar cada permiso en cada pedido.
//   usuario   → la barra del HTML: Explorar · Búsquedas · Publicar · Mensajes · Cuenta
//   moderador → Explorar · Moderar · Reportes · Cuenta
//   admin     → Moderar · Usuarios · Estadísticas · Panel · Cuenta (talleres, reportes y contacto, en el Panel)
//   mecanico  → Explorar · Mi taller · Cuenta
//   empresa   → Explorar · Mi empresa · Publicar · Mensajes · Cuenta (una concesionaria vende, no compra)
// Las cuentas del equipo y las de los talleres no compran ni venden: no ven Búsquedas, Publicar ni Mensajes.
(() => {
    let usuario = null;
    try {
        const guardada = JSON.parse(localStorage.getItem('autocar.sesion'));
        if (guardada?.usuario && !(guardada.vence && Date.now() > guardada.vence)) usuario = guardada.usuario;
    } catch {
        // Sin almacenamiento: no hay sesión que mirar.
    }
    const rol = usuario?.rol;
    if (!['admin', 'moderador', 'mecanico', 'empresa'].includes(rol)) return;

    const base = document.currentScript.src;
    const url = (ruta) => new URL(`../pages/${ruta}`, base).href;
    // [texto, página, otras páginas de esa sección]: el link queda marcado en cualquiera de ellas
    const EXPLORAR = ['Explorar', 'info/home.html', ['vehiculos/buscar.html', 'vehiculos/vehiculo.html']];
    const ITEMS = {
        moderador: [EXPLORAR, ['Moderar', 'admin/admin-moderar.html'],
            ['Reportes', 'admin/admin-soporte.html']],
        admin: [['Moderar', 'admin/admin-moderar.html'], ['Usuarios', 'admin/admin-usuarios.html'],
            ['Estadísticas', 'admin/admin-metricas.html'],
            ['Panel', 'admin/admin.html', ['admin/admin-talleres.html', 'admin/admin-empresas.html', 'admin/admin-soporte.html',
                'admin/admin-parametros.html', 'admin/admin-fallas.html', 'admin/admin-vehiculos.html']]],
        mecanico: [EXPLORAR, ['Mi taller', 'talleres/taller.html', ['talleres/taller-verificacion.html']]],
        empresa: [EXPLORAR, ['Mi empresa', 'vehiculos/empresa-panel.html', ['vehiculos/empresa.html']],
            ['Publicar', 'vehiculos/mis-publicaciones.html', ['vehiculos/publicar.html']], ['Mensajes', 'operaciones/mensajes.html']],
    }[rol];
    const aqui = window.location.pathname;
    const esAqui = (ruta) => new URL(url(ruta)).pathname === aqui;

    // Ícono de escudo, armado con el DOM (en el proyecto no se usa innerHTML)
    function icono() {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        Object.entries({
            width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
            'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
        }).forEach(([k, v]) => svg.setAttribute(k, v));
        ['M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z', 'm9 12 2 2 4-4'].forEach((d) => {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', d);
            svg.append(path);
        });
        return svg;
    }

    function item(texto, ruta, otras = []) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'barra__enlace';
        a.href = url(ruta);
        if ([ruta, ...otras].some(esAqui)) a.setAttribute('aria-current', 'page');
        const caja = document.createElement('span');
        caja.className = 'barra__icono';
        caja.append(icono());
        const etiqueta = document.createElement('span');
        etiqueta.textContent = texto;
        a.append(caja, etiqueta);
        li.append(a);
        return li;
    }

    // Se arma apenas está el HTML y antes que navegacion.js (que va después y ubica la píldora en el link marcado).
    // Si esperara a DOMContentLoaded, la píldora quedaba en un link de la barra del usuario que ya no está.
    function armar() {
        const lista = document.querySelector('.barra__lista');
        if (lista) {
            // Queda solo "Cuenta" de la barra original; el resto lo pone el rol. Cuenta solo queda marcada en su página
            // (en la barra del usuario también marca páginas que para el rol son de otra sección)
            const cuenta = Array.from(lista.children).find((li) => li.querySelector('a[href$="cuenta.html"]'));
            if (cuenta && !esAqui('auth/cuenta.html')) cuenta.querySelector('a').removeAttribute('aria-current');
            lista.replaceChildren(...ITEMS.map(([texto, ruta, otras]) => item(texto, ruta, otras)), ...(cuenta ? [cuenta] : []));
            lista.classList.add('barra__lista--admin');
        }

        // Portada (index.html): el acceso a lo del rol en el menú de arriba, antes de "Ingresar"
        document.querySelectorAll('.marca-nav nav').forEach((nav) => {
            const enlace = document.createElement('a');
            const [destino, texto] = { mecanico: ['talleres/taller.html', 'Mi taller'], empresa: ['vehiculos/empresa-panel.html', 'Mi empresa'] }[rol]
                ?? ['admin/admin.html', 'Panel'];
            enlace.href = url(destino);
            enlace.textContent = texto;
            nav.insertBefore(enlace, nav.querySelector('.nav-ingreso'));
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar);
    else armar();
})();
