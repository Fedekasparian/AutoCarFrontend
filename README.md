# AutoCar

Proyecto integrador de Programación en Ambiente Web (11086), UNLu, comisión 50. Federico Kasparian, Justino Bernal, Lautaro Marino y Mateo Ponti. Los legajos figuran en [autores.txt](autores.txt) y la versión en [VERSION](VERSION).

AutoCar conecta a quienes compran y publican autos usados con mecánicos independientes. En **Explorar** aparecen los avisos que particulares y concesionarias publicaron en AutoCar. En **Búsquedas**, el metabuscador reúne avisos de otros sitios. Desde un aviso, el comprador puede elegir un taller y pedir una inspección antes de decidir si compra.

## Entrega final

- [Guía de uso y alcance de la inspección](Entrega_Final/guia-de-uso.md). Incluye el recorrido de la demo, cómo se estiman los arreglos y la decisión sobre reclamos de la E4.
- [Arquitectura, modelo de objetos y ejemplo de una inspección](Entrega_Final/arquitectura-y-modelo.md).
- [Seguridad por capa](Entrega_Final/seguridad-por-capa.md).
- [Presentación final](Entrega_Final/AutoCar-presentacion-final.pptx). Las decisiones de las entregas anteriores se conservan en sus carpetas con su fecha.

## Ejecutar y probar el front

HTML, CSS y JavaScript sin compilación. Para abrir la app en local con API, seguí la [configuración de entornos](infraestructura.md). En Vercel, `middleware.js` reenvía `/api/*` al servidor indicado por `BACKEND_URL` en el entorno seleccionado. Si falta esa variable, responde 503.

Con Node 20 o posterior, ejecutá `npm ci` y `npm test`. Para las pruebas de punta a punta, instalá los navegadores con `npx playwright install` y ejecutá `BASE_URL=<url-del-front-dev> npm run test:e2e`. Para producción, el proyecto dispone de una prueba de lectura con `npm run test:humo`.

[Repositorio de la API](https://github.com/MateoPonti/AutoCarBackend)
