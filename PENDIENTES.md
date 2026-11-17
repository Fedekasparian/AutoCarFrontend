# Pendientes de AutoCar

Lista viva de lo que falta. Cuando alguien toma un ítem, pone su nombre; cuando lo termina, lo tacha (`~~así~~`) o lo borra con el PR que lo resuelve.
El plan completo del enfoque del mecánico está en [`modelo-de-negocio/PLAN.md`](modelo-de-negocio/PLAN.md).

Última actualización: 17/11/2026 (tarde). Las decisiones están en [`ideas-14-11-2026/decisiones-14-11-2026.md`](ideas-14-11-2026/decisiones-14-11-2026.md) y el plan en [`modelo-de-negocio/PLAN.md`](modelo-de-negocio/PLAN.md); los tres dicen lo mismo.

## Pedido de la cátedra para la entrega final (mapa de capas del 10/11)

En orden, de adentro hacia afuera. Las ideas A y B se piden **las dos** (puntos 3 y 4); en la integración real (punto 5) alcanza con **una** de las tres opciones.

- [x] ~~**1. Circuito usable en producción**~~: talleres aprobados e inspecciones en Neon main (11/11). Falta que el ranking tenga historia (ver "Datos y scraper").
- [x] ~~**2. Los dos invariantes**~~: un solo pedido en curso por comprador y aviso, y moderación con el estado leído (back, migración `020`).
- [x] ~~**3. Idea A, costo total del auto**~~ (17/11, back migración `025`): al firmar, cada arreglo del informe se le pide a 3 talleres de la red (nunca al que inspeccionó, primero los de su localidad); el taller responde en Mi taller y el informe muestra el costo total (aviso + el presupuesto vigente más barato de cada arreglo).
- [x] ~~**4. Idea B, fallas típicas por modelo**~~ (17/11, back migración `026`): la inspección guarda marca y modelo (obligatorios para firmar, misma clave que el comparador); fallas con origen internet (las carga el admin en Parámetros, con la fuente) o mecánicos (las propone uno en el checklist); el voto de los mecánicos las confirma o descarta; el porcentaje medido sale de las inspecciones y no se muestra con menos de 20. Se ven en el auto, en el informe y en el checklist.
- [x] ~~**5. Una integración real andando**~~: la corrida diaria del scraper en GitHub Actions (workflow `Scraper`, todos los días a las 06:00 de Argentina desde `main`) anda sola desde el 12/11 y carga el Firestore de producción. Las que fallaron fueron el 09/11 y el 11/11.
- [x] ~~**6. Metabuscador adentro o afuera**~~: **queda**. Autos cargados en prod, "Mandale un mecánico" en cada resultado y aviso de cambio de precio (nuevos, bajaron y retirados en los resultados; avisos sin ver en las búsquedas guardadas). El aviso es dentro del sitio, no por mail.
- [x] ~~**7. Fondo de garantía**~~ (17/11, back migración `024`): saldo con aportes de cada inspección y franquicias; salen devolución y compensación de cada reclamo que procede; el mecánico paga una franquicia del 40 %. Se ve arriba de Reclamos, con el supuesto de la cuenta.
- [x] ~~**8. Maquetas afuera y `PLAN.md` al día**~~: maquetas sacadas el 14/11; `PLAN.md`, el README del modelo de negocio y las decisiones puestos al día el 17/11 (A y B dejaron de ser "fase 2").

## Hecho el 10/11 (ya en `main` desde el 11/11)

Todo entró a `dev` por PR (front #40 a #66, back #17 a #34) y pasó a `main` el 11/11. **Verificado el 11/11 con una consulta de solo lectura: Neon main y Neon dev tienen corridas todas las migraciones, de la `001` a la `020`.** La próxima nueva es la `021`.

| Migración | Qué hace |
|---|---|
| `011-vehiculo-con-vendedor.sql` | Toda publicación tiene vendedor (`usuario_id NOT NULL`); los autos sin dueño pasan a `vendedor-demo@autocar.test` |
| `012-favoritos.sql` | Tabla `favorito` |
| `013-marcas-y-modelos.sql` | Tablas `marca` y `modelo` (62 marcas, ~1.080 modelos del scraper) y clave foránea `vehiculo (marca, modelo)` |
| `014-foto-de-perfil.sql` | Tabla `usuario_foto` |
| `015-contacto-y-reportes.sql` | Tablas `contacto` y `reporte` |
| `016-roles-del-equipo.sql` | El admin sin los permisos del mecánico |
| `017-modelos-nuevos.sql` | 7 marcas y 46 modelos más para Publicar (solo agrega) |
| `018-inspeccion-no-realizada.sql` | Estado `no_realizada` de una inspección (el mecánico fue y no la pudo hacer) |
| `019-marca-unica.sql` | La base no acepta la misma marca escrita distinto ("DS" y "Ds") |
| `020-seguridad.sql` | Un solo pedido de inspección en curso por comprador y aviso, y tabla `login_intento` (5 intentos cada 15 minutos) |

- [x] ~~**Correr la `019` en Neon dev**~~ (11/11).
- [x] ~~**Correr `011`–`020` en Neon main**~~ (verificado el 11/11).

- [x] **El panel solo modera y da de baja:** se sacan crear y editar vehículos (back `POST`/`PUT /api/admin/vehiculos` → 405; front sin `admin-vehiculo.html`). Si algo está mal, el moderador rechaza con motivo y corrige el dueño.
- [x] **Vendedor obligatorio** en toda publicación (la base lo exige).
- [x] **Marcas y modelos en la base:** `GET /api/marcas-modelos`; Publicar ya no tiene la lista fija; el back responde 422 y la base rechaza una marca o modelo que no está ("Pepita 21021").
- [x] **Favoritos reales:** `GET/PUT/DELETE /api/favoritos`, botón en el detalle y `favoritos.html` con datos reales (una sola lista; sin las listas de ejemplo).
- [x] **Detalle del vehículo:** vendedor (nombre, foto y desde cuándo, sin el email), versión, estado general y ubicación.
- [x] **Editar perfil:** nombre (`PUT /api/me`) y foto de perfil opcional, que se cambia tocándola (`POST`/`DELETE /api/me/foto`). Se ve en Mi cuenta, en el detalle y en el chat.
- [x] **Fotos de cualquier tamaño:** se achican en el navegador antes de subirlas (perfil 512 px, publicaciones 1600 px). El back sigue con 2 MB.
- [x] **Mandale un mecánico solo desde un auto:** sin `?url=` no se puede pedir (el link siempre llega fijo). Se sacó "Mandale un mecánico a otro auto" y "Elegir" del ranking.
- [x] **Mi cuenta con cantidades reales** de favoritos y publicaciones (antes "4 vehículos en 2 listas" y "2 activas" fijos).
- [x] **Metabuscador conectado** a la API, sin datos de ejemplo y sin "Completar con IA".
- [x] **Chat:** solo la foto de la persona (o su inicial), en círculo.
- [x] **Roles:** el equipo (admin, moderador) y los talleres no compran ni venden (back 403 con el guard `usuario`); nadie modera su propia publicación; el admin ya no ve "Mi taller". La barra de arriba cambia según el rol (back #24, front #55).
- [x] **Middleware** (`src/Core/Middleware.php`): los guards de las rutas, antes del controlador (back #22).
- [x] **Fotos en el catálogo:** se mostraban en gris porque se leía el campo viejo `imagen_url` (#55).
- [x] **Ganancias de las inspecciones** en Estadísticas (pago simulado): ganancia de AutoCar, facturado, mecánicos, fondo y retenido (back #28, front #60).
- [x] **Marcas con un solo nombre** (10/11 noche): "DS"/"Ds"/"D.S.", "Citroën"/"Citroen", "KIA"/"Kia"... salen como una sola marca en el metabuscador (back #29), "DS3" y "DS 3" son el mismo modelo (back #32, Firestore dev ya corregido) y la base no acepta una marca repetida con otra escritura (back #31, migración 019).
- [x] **Marcas que no están en el catálogo** (back #33): el importador no carga esos autos y lo avisa en la salida; `php bin/importar-autos.php --revisar-marcas archivo.json` los lista con su link para ver si es una marca nueva o un error del que publicó. Lee el catálogo de `MARCAS_URL` (la API del back de cada entorno).
- [x] **Inspección que no se pudo hacer** (back #30, front #63, migración 018): si el vendedor no deja revisar el auto, el mecánico la marca con el motivo y se le devuelve todo al comprador.
- [x] **Resultados del metabuscador en celular** (front #62): los botones de cada auto bajan debajo del texto.
- [x] **Borrar búsquedas guardadas** (front #65 y #66): con un cuadro de confirmación del sitio (antes `confirm()` del navegador, el único que había) y desde la lista, con un tachito que se pone rojo al pasar el mouse.
- [ ] **Pantalla de roles y permisos** para el admin (hoy los permisos de cada rol se cambian en la base).
- [x] **Scraper:** `diario.bat` con 1 GB de memoria (la corrida completa de MercadoLibre, ~80.000 autos, se quedaba sin memoria al guardar).
- [ ] **Probar todo junto en dev** (front de dev + `autocarbackend-dev`). Ojo: el servicio de Render dev estaba desplegando `main`; ya se pasó a `dev`.

## Entrega 4

- [x] ~~**Aprobar el PR #20 (`dev` → `main`)**~~: mergeado. Después entraron a producción el #33 (la raíz redirige a `/front/`) y el #37 (chat, formularios de maqueta, botones de Mi taller y huella oculta). Producción verificada: humo 15/15 en Chromium, Firefox y WebKit.
- [x] ~~**Tag `Entrega_4`**~~ en los dos repos, sobre `main` (mismo formato que `Entrega_1` a `Entrega_3`): front `fdc93ed`, back `fa40a54`.
- [x] ~~**Documento de seguridad por capa**~~: [`Entrega_4/seguridad-por-capa.md`](Entrega_4/seguridad-por-capa.md). Quedan sus pendientes (§ 6): rate limiting, usuario de Neon con privilegios mínimos, concurrencia al moderar.
- [x] ~~**Validación W3C y accesibilidad**~~: 41 páginas sin errores y 0 violaciones de WCAG A/AA, en [`Entrega_4/validacion-w3c-y-accesibilidad.md`](Entrega_4/validacion-w3c-y-accesibilidad.md).
- [x] ~~**E2E en Firefox y WebKit**~~: `playwright.config.js` corre los tres navegadores y el workflow los instala. Inspecciones pasó en los tres (local) y humo en los tres (producción).
- [ ] **El workflow E2E nunca se disparó solo**: está armado para correr cuando Vercel termina un deploy (`deployment_status`), pero en Actions no hay ninguna corrida. Hoy las E2E corren a mano (`npm run test:e2e` o Actions → E2E → Run workflow). Revisar si Vercel manda ese evento al repo. Render no corre pruebas: solo construye la imagen (el `.dockerignore` deja afuera `tests/`).

## Front: pantallas que siguen siendo maqueta

- [x] ~~**Metabuscador**~~: conectado el 10/11 (ver arriba).
- [x] ~~**Portada**~~: muestra los últimos 4 publicados de verdad (#52).
- [x] ~~**Contacto**~~: `POST /api/contacto` y "Reportes y contacto" en el panel (back #21, front #51).
- [x] ~~**Reportar publicación / usuario**~~: `POST /api/reportes`, desde el detalle y desde el chat; los revisa el moderador (back #21, front #51).
- [x] ~~**Canje** (`proponer-canje.html`, `propuestas.html`)~~: **sacado el 14/11**. Era maqueta: el back nunca tuvo propuestas de canje y todos los botones decían "no está disponible". Queda la marca "acepta canje" al publicar; el canje se arregla por el chat. Si el grupo lo quiere hacer de verdad, es una idea para después.
- [x] ~~**Tasación con IA**~~: se sacó (no se va a hacer). En su lugar, el detalle muestra el comparador de precio (#50, #52).
- [x] ~~**Chat**~~ conectado a la API: bandeja con no leídos, conversación con polling cada 5 s y "Consultar" en `vehiculo.html`. Prueba E2E en `tests/e2e/chat.spec.js` (necesita los secretos `E2E_CHAT_*`).
- [ ] **Secretos de E2E en GitHub** (Settings → Secrets → Actions), con cuentas de **dev**: `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`; `E2E_CHAT_VEHICULO_ID`, `E2E_CHAT_VENDEDOR_EMAIL` y `E2E_CHAT_VENDEDOR_PASSWORD` (una publicación disponible en Neon dev y la cuenta de su vendedor).
- [x] ~~**Planes** (`planes.html`, `plan.html`)~~: **sacados el 14/11** (niveles Bronce a Platino que no se cobraban). También **Mapa** (`mapa.html`, precios inventados) y **Verificar vehículo** (`verificar-vehiculo.html`, flujo viejo).
- [x] ~~**Formularios con `action` a rutas que no existen**~~: ahora llevan `data-proximamente` y `js/proximamente.js` avisa "todavía no está disponible" sin enviar nada. Al 11/11 quedan en `plan.html`, `proponer-canje.html`, `propuestas.html` y `verificar-vehiculo.html` (el resto ya está conectado). Al conectar una pantalla a la API, se le saca el atributo y el script. El chat se conecta aparte.

## Hecho el 14/11 (en `dev`)

Lo que pidió el profe el 13/11 ("variables y controles"). Todas las decisiones están en `ideas-14-11-2026/decisiones-14-11-2026.md` (rama `docs/ideas-14-11-2026`).

- [x] **Parámetros editables por el admin** (back migración `021`, panel → Parámetros): comisión de AutoCar (23 %), parte al fondo (1/3), tope de compensación (3×), días de reclamo (15) y precio de la inspección (mín. $70.000, sugerido $100.000, máx. $150.000). Cada cambio queda anotado. Cada inspección guarda el tope y los días con los que se pidió. El front ya no repite el 23 % ni los 15 días: los lee de `GET /api/parametros`.
- [x] **"¿Para qué buscás el auto?"** (personal, familia, trabajo, aplicación; sin revendedor), obligatoria para las cuentas personales la primera vez que entran; tipo, presupuesto y zona opcionales. Se cambia desde Mi cuenta. En Métricas: "Para qué buscan el auto".
- [x] **Política de privacidad**: se acepta al registrarse (obligatorio); las cuentas viejas la aceptan junto con la pregunta de arriba. Texto en Legales.
- [x] **Maquetas afuera**: canje, planes, mapa y verificar vehículo.
- [x] **Cómo funciona** (`como-funciona.html`, front #80): comprar, vender y ser mecánico, con los números de los parámetros. El detalle del auto muestra "Acepta canje" y Explorar ofrece "Autos hasta $X para vos" si el usuario dio su presupuesto.
- [x] **Patente e historial** (back migración `022`): el mecánico carga la patente y una foto de la chapa en el checklist; sin las dos no se firma y la patente entra en la huella. ~~`historial.html` busca las inspecciones firmadas de una patente~~ (se sacó el 15/11, ver abajo). Las firmadas de antes tienen patentes inventadas (`AD000DM`…, la misma por aviso).

**Cambios de la noche del 14/11 (front y back #51, en `dev`):**

- [x] **Perfil con tarjetas**: "¿Para qué buscás el auto?" ahora es un cartel encima de la página (se ve el sitio atrás, borroso) con cuatro tarjetas: Para mí, Para la familia, Para trabajar y Para manejar con aplicaciones. No se cierra hasta elegir una. Se sacaron tipo de auto, presupuesto y zona, y el atajo "Autos hasta $X para vos" de Explorar. Desde Mi cuenta se cambia con las mismas tarjetas.
- [x] **Metabuscador "para vos"**: con el perfil, cada auto tiene un puntaje (precio contra autos parecidos, km, días publicado y año, con distinto peso por perfil) y un motivo ("Te conviene: 18 % más barato que autos parecidos…"). Es el orden por defecto si el usuario tiene perfil.
- [x] ~~**"Patentes" en la barra de arriba**~~ (se sacó el 15/11 junto con el buscador).
- [x] **Fotos reales en las publicaciones de dev** (Wikimedia Commons, licencias libres). Los E2E suben una foto real de un Ford Ka en vez del recuadro rojo.

**Historial del auto dentro del informe (15/11, back y front):**

- [x] **Ya no hay buscador por patente** (se sacaron `historial.html`, "Patentes" de la barra y `GET /api/historial-patente`). Si cualquiera podía ver la conclusión de una inspección de ayer, nadie pagaba la suya; y el comprador casi nunca tiene la patente (los avisos no la muestran).
- [x] **El historial viene con la inspección que se paga**: el informe firmado trae "Historial de este auto", las inspecciones anteriores de la misma patente (aunque hayan sido por otro aviso o en otra página) con fecha, km, conclusión, taller, qué ítems no estaban OK y si un reclamo procedió. Las notas y las fotos de esos informes no. Si el aviso dice menos km que una inspección anterior, avisa "Ojo con los km".
- [x] **El mecánico también lo ve**: al cargar la patente en el checklist se guarda el borrador y aparece si el auto ya se revisó antes (y qué encontraron), para saber dónde mirar.
- Para la defensa: en dev ninguna patente se repite, así que para mostrarlo el mecánico tiene que cargar en una inspección nueva la patente de un auto ya inspeccionado.
- A futuro (no para el 18/11): vender la copia del informe completo al que terminó comprando el auto (30 % del precio, ya decidido) y las fallas típicas por modelo.

### Falta para el 18/11

- [x] ~~**Auto vendido**~~ (17/11, back migración `024`): turno que confirma el vendedor y se cae si el aviso pasa a pausado o vendido; si el mecánico ya fue, se firma igual y el comprador original recibe un crédito del 30 %; cupón solo con turno confirmado y aviso vendido dentro de las 48 h.
- [x] ~~**Fondo de garantía con saldo** y franquicia del mecánico (40 % de lo que cobró)~~. Franquicia, crédito y horas del cupón son parámetros.
- [x] ~~**Correr `024`, `025` y `026` en Neon dev**~~ (17/11). Las firmadas de las E2E quedaron como Volkswagen Gol Trend. Todo mergeado a `dev` (back #65, #67, #66; front #98, #99) y probado: E2E de inspecciones contra el preview de dev, 9 pasan (las que necesitan admin se saltean).
- [ ] **Pase a `main`**: correr `024`, `025` y `026` en Neon main y mergear `dev` → `main` en los dos repos.
- [x] ~~**E2E de auto vendido**~~ (17/11): con la cuenta admin de dev pasan las 8 de `auto-vendido`, `inspecciones`, `preferencias` y `publicar` en Chromium contra el preview de dev. Falta cargar `E2E_ADMIN_*` como secretos de GitHub para que corran en Actions.
- [x] ~~**Corregir el doc de ideas**~~ (17/11): la carpeta `ideas-14-11-2026/` entró a `dev` y `PLAN.md`, el README del modelo de negocio, el guion y este archivo dicen lo mismo. La rama `docs/ideas-14-11-2026` se borró.
- **Pagos al mecánico** (a los 10 y a los 15 días): **pasan al final** (17/11), junto con la decisión de usar o no Mercado Pago.
- [x] **Pase a main** (14/11 noche): `021` y `022` corridas en Neon main y dev → main mergeado en los dos repos (back #54, front #83).

### Del 21/11 al 30/11

- [ ] Datos de prueba de las ideas A y B: presupuestos respondidos y fallas típicas (de internet, con fuente) en 3 o 4 modelos, y 20 inspecciones firmadas de un modelo para que se vea el porcentaje medido.
- [ ] Foto obligatoria al marcar una falla y auditoría al azar en el ranking.
- [x] ~~Revisar el guion de la demo~~: reescrito el 17/11 para la URL pública, con auto vendido, costo total, fallas típicas, fondo y parámetros.
- [ ] **Ensayar la demo** con el guion nuevo: primero en dev, el día de la defensa en producción.
- [ ] Recomendar autos según "¿Para qué buscás el auto?" (las publicaciones no tienen tipo de auto).
- [ ] Al final: pagos al mecánico, Mercado Pago sandbox y suscripción del vendedor.
- [ ] E2E automático en cada PR y secretos `E2E_ADMIN_*` / `E2E_CHAT_*` en GitHub.

## Suscripciones y pagos (no hay nada hecho)

Decidido el 14/11: el comprador no tiene plan pago. **Publicar es gratis y sin límite**; la **suscripción del vendedor** da prioridad de sus publicaciones y precio sugerido con tiempo estimado de venta. Es lo último que se hace. El pago de la inspección entra a la cuenta de AutoCar y se le paga al mecánico a los 10 días (menos la franquicia, 40 %) y a los 15 (la franquicia, si no hubo reclamo).

- [ ] **Suscripción del vendedor** (con o sin; el precio, como parámetro del admin).
- [ ] **Mercado Pago sandbox** para la inspección (acreditación a 35 días). Charlado el 14/11, **sin decidir cómo hacerlo**; el 17/11 quedó para el final, junto con los pagos al mecánico:
  - **Cobro al comprador** (se puede hacer real en sandbox): Checkout Pro → el comprador paga con tarjeta de prueba y vuelve a AutoCar; Mercado Pago avisa al back (webhook, Render dev es público) y la inspección pasa a pagada. Con la API REST directo desde PHP, sin SDK (regla de no usar dependencias). Más o menos un día de trabajo. **Falta:** crear la cuenta de desarrollador de Mercado Pago, la aplicación y los usuarios de prueba, y pasar las credenciales de prueba.
  - **Pago al mecánico** (a los 10 y 15 días): propuesta = simulado. Hasta donde sabemos (sin verificar en la documentación), Mercado Pago no tiene una API simple para transferirle a otra cuenta cuando AutoCar quiere. El modelo marketplace (el mecánico conecta su cuenta y se reparte al cobrar) choca con retener la plata 10/15 días. Idea: el back calcula montos y fechas, el admin ve "a pagar hoy" y marca "transferido" (como una transferencia bancaria).

## Datos y scraper

- [ ] **Inspección de un auto que juntó el scraper**: hoy el back acepta cualquier link de MercadoLibre, Kavak, Autocosmos o AutoCar (controla el dominio, no que el auto exista). Ya hay autos en Firestore dev: si el link coincide con uno scrapeado, marcar el pedido como "auto verificado en nuestro buscador" y completar solos título, año, km y precio; si no coincide, aceptarlo igual sin la marca.

- [x] ~~**Cargar los autos del scraper en Firestore dev**~~ (10/11): corridas completas de MercadoLibre (86.395 autos, 958 modelos), Autocosmos (4.750) y Kavak (1.330); comparador con 1.073 modelos. Probado en dev: comparador y metabuscador con datos reales. Arreglos que salieron con datos de este tamaño: commits de Firestore por tamaño (back #26), autos mal cargados que no arruinan la corrida (back #27), `diario.bat` con 1 GB (back #18), etiquetas del metabuscador (front #58).
- [x] ~~**Neon main**~~: migraciones `011`–`020` corridas y `dev` → `main` mergeado (11/11).
- [x] ~~**Talleres de demo en producción**~~ (11/11): 5 talleres aprobados (`*@autocar.test`: Acosta, Benítez, Gómez, Medina, Ferreyra), 3 compradores y 15 inspecciones firmadas, 3 por mecánico. Ya se puede pedir una inspección sobre la URL pública. Son distintos de los de la `007`, que sigue solo en dev.
- [x] ~~**Firestore prod (`autocar-9897d`)**~~: cargado desde el 11/11 por la corrida del workflow `Scraper` (sin el historial de dev) y actualizado todos los días.
- [x] ~~**Corrida diaria** del scraper~~: GitHub Actions, todos los días desde el 12/11. `diario.bat` en la PC queda para correrla a mano (su `.env` necesita `MARCAS_URL`).
- [ ] **Ranking con historia, en dev y en prod**: hoy en prod los 5 tienen 3 firmadas, 5,0 y ningún reclamo, así que en la demo nadie baja en el ranking. `bin/demo-historial.php` busca los emails de la `007` (`mecanicoN@demo.autocar.com.ar`): en dev anda pero todavía no se corrió; en prod falla porque esos usuarios no existen. Para prod hay que adaptarlo a los talleres `*@autocar.test` o cargar un par de reclamos desde el sitio.

## Presentación y defensa

- [ ] **Ensayar la demo** con el guion (N4), reescrito el 17/11.
- [ ] **Confirmar la fecha de la entrega final** (16/11 o la semana del 23/11; defensa el 30/11).
