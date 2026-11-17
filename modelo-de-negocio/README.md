# Modelo de negocio (v4)

**Programación en Ambiente Web · UNLu Mercedes · 2026**
**Grupo:** Bernal Justino · Kasparian Federico · Marino Lautaro · Ponti Mateo

| Documento | Qué contiene |
|---|---|
| [Presentación](AutoCar-modelo-de-negocio.pptx) | El modelo de negocio para exponer |
| Este README | El mismo contenido en texto, con más detalle |
| [PLAN.md](PLAN.md) | Qué tenemos que programar, qué ya está, qué falta y en qué orden |
| [Decisiones del 14/11](../ideas-14-11-2026/decisiones-14-11-2026.md) | Las respuestas a la devolución del profe del 13/11 ("variables y controles"): precio, parámetros, patente, auto vendido, plata, planes. **Si algo de este README no coincide, vale ese archivo** |

> **v4 (08/11/2026).** Reemplaza a la v3, que tenía como eje "la publicación que se compara sola". Cambia por la devolución del profe: MercadoLibre ya muestra precios de referencia, así que el precio justo dejó de diferenciarnos. El eje nuevo es **el mecánico independiente que firma**. Al final está la sección [Qué cambió respecto de la v3](#qué-cambió-respecto-de-la-v3).

## En una frase

Encontrás un usado en cualquier sitio y AutoCar te manda un mecánico que **elegís vos**. El mecánico **firma el informe con su nombre** y, si se le pasó algo que se veía, **te devolvemos la plata y te compensamos**.

## Misión, visión y valores

- **Misión:** que nadie en Argentina compre un usado a ciegas. Cualquier auto, esté publicado donde esté, puede pasar por un mecánico independiente que firma lo que revisó y responde si se equivoca.
- **Visión:** que en Argentina todo el que compre un usado pregunte "¿lo revisó un mecánico de AutoCar?". Es **solo para usados**: un 0 km ya tiene la garantía de fábrica y la revisión no aporta nada.
- **Valores:**
  - **Independencia:** el mecánico lo elige el comprador. El vendedor no lo elige ni puede pagar para cambiar el resultado.
  - **Responsabilidad:** cada informe lleva nombre y apellido. Si el mecánico se equivoca, responde.
  - **Transparencia:** el ranking de mecánicos es público y nadie puede pagar para subir.

## El problema

Los avisos sobran y el precio de referencia ya lo da MercadoLibre. Lo que nadie resuelve es **"¿está bien de verdad este auto?"**, contestado por alguien que no tenga interés en la venta y que responda si se equivoca.

| | Qué pasa hoy |
|---|---|
| **01. El que revisa tiene interés** | Kavak, CarOne y Flash revisan los autos, pero el que revisa es el mismo que te vende o el que te quiere comprar el auto. |
| **02. Nadie firma** | Los inspectores son anónimos. Si se les pasa algo, nadie responde. |
| **03. El particular no tiene a quién llamar** | Si comprás en MercadoLibre o Marketplace, como mucho lo llevás a "un mecánico conocido": no deja un informe, no responde, y si el auto está en otra ciudad no tenés a nadie. |

¿Y el precio justo? MercadoLibre ya muestra precios de referencia. **No competimos ahí**: lo usamos como un dato más dentro del informe y del metabuscador.

## La solución: "Mandale un mecánico"

1. **Encontrás el auto en cualquier lado.** Pegás el link de MercadoLibre, Kavak, Autocosmos o AutoCar, o tocás el botón **"Mandale un mecánico"** en el metabuscador.
2. **Elegís un mecánico de la zona** por su ranking. El vendedor no puede elegirlo.
3. **El mecánico revisa y firma.** Completa el checklist y firma el informe con su nombre. Una vez firmado, el informe no se puede cambiar.
4. **Si se le pasó algo que se veía,** el comprador reclama. Si el reclamo procede, AutoCar devuelve lo que pagó, le paga una compensación y el mecánico baja en el ranking.

El comprador paga la inspección. AutoCar se queda una parte y el resto es para el mecánico.

**Para arrancar no hacen falta autos publicados en AutoCar:** se revisan los autos que ya están publicados en otros sitios. Se empieza con **5 talleres de Mercedes y Luján**.

### Las reglas que lo hacen confiable

| Regla | Por qué |
|---|---|
| El comprador elige al mecánico. El vendedor no lo elige y tampoco ve quién es hasta la cita. | Es lo que nos diferencia de Kavak, CarOne y Flash. |
| El mecánico no puede revisar su propio auto ni uno publicado por él. | Para que no tenga interés en el resultado. |
| El informe se firma con nombre y apellido y queda cerrado. Se guarda una huella (hash) para comprobar que nadie lo modificó. | La firma tiene que valer algo. |
| Se responde por lo que **se veía**: lo que se detecta con el checklist sin desarmar el auto. Lo oculto o lo intermitente queda afuera, y eso se dice antes de pagar. | Si no, ningún mecánico se suma. |
| El comprador tiene **15 días** desde la firma para reclamar. Lo resuelve AutoCar con las pruebas (fotos, informe de otro taller). | Plazo corto y claro. |
| El ranking se calcula con las inspecciones firmadas y los reclamos que procedieron. **No se vende ni se puede pagar para subir.** | Si se pudiera pagar, la firma dejaría de valer. |

### El metabuscador, enganchado al mecánico

- Guardás una búsqueda y AutoCar te muestra autos de **MercadoLibre, Kavak, Autocosmos y AutoCar** juntos (scraping). Arrancamos con estos y después sumamos más sitios.
- Te avisa cuando aparece un auto nuevo o cuando uno baja de precio.
- **Lo nuevo:** cada auto, sea del sitio que sea, tiene el botón **"Mandale un mecánico"**. Kavak te muestra solo su stock y MercadoLibre solo sus avisos. AutoCar te muestra todo y además te lo revisa.
- Al lado de cada auto, como dato, va la comparación de precio contra autos iguales (el comparador que ya hicimos).

### ¿Y los papeles?

No hay una API pública del Registro Automotor para consultar deudas, prendas o embargos, y el informe de dominio se pide y se paga en el Registro. Por eso **no prometemos "papeles limpios"**. Lo que sí hacemos:

- El checklist del mecánico incluye **que el número de motor y el de chasis coincidan con la cédula**, porque eso se ve en el auto.
- El informe le muestra al comprador **qué tiene que pedir antes de pagar** (informe de dominio, libre deuda de patentes, VTV y formulario 08), con el link a cada trámite.

## Por qué AutoCar

| | Kavak | CarOne / Flash | MercadoLibre / Marketplace | Mecánico conocido | **AutoCar** |
|---|---|---|---|---|---|
| ¿Quién revisa? | Un técnico de Kavak, que vende el auto | El que te compra el auto | Nadie | Tu mecánico | **Un mecánico independiente** |
| ¿Quién lo elige? | Kavak | La empresa | — | Vos | **Vos (el comprador)** |
| ¿Firma con su nombre? | No | No | — | No deja informe | **Sí** |
| ¿Responde si se equivoca? | Solo por los autos de Kavak | No | — | No | **Devolución, compensación y baja en el ranking** |
| ¿Sirve para cualquier auto? | Solo su stock | Solo para venderles | — | Sí, si está cerca | **Sí, de cualquier sitio** |
| ¿Te muestra autos de todos los sitios? | No | No | Solo sus avisos | — | **Sí (metabuscador)** |

## Qué gana cada uno

| Rol | Qué gana |
|---|---|
| **Comprador** | Una revisión de alguien que no tiene interés en la venta, un informe firmado para negociar el precio y cobertura si el mecánico se equivocó. Además, busca en todos los sitios desde un solo lugar. |
| **Mecánico / taller** | Trabajo nuevo sin gastar en publicidad. Cobra cada inspección sin tener que perseguir al cliente. Si revisa bien, sube en el ranking y le llegan más pedidos. Más adelante, también arreglos de autos que revisó otro (ver la idea A en la hoja de ruta). |
| **Vendedor** | Un auto con informe de AutoCar se vende más rápido y con menos regateo. Más adelante va a poder pedir el "informe para vender": lo paga él, pero el mecánico lo asigna AutoCar, así sigue siendo independiente. |
| **AutoCar** | Una parte de cada inspección y, más adelante, la comisión de los talleres y los planes pagos. Con cada inspección acumula datos de fallas reales, algo que nadie tiene en Argentina. |

Al principio el foco está en el comprador y en 5 talleres. Si el comprador confía, los talleres quieren estar y los vendedores empiezan a pedir el informe.

## Cómo se sustenta

### Una inspección, en números (ejemplo para validar con los talleres)

| Concepto | Monto |
|---|---|
| El comprador paga la inspección (precio sugerido; cada taller pone el suyo entre $ 70.000 y $ 150.000) | **$ 100.000** |
| → para el mecánico (77 %) | $ 77.000 |
| → para AutoCar (23 %) | $ 23.000 |
| De lo de AutoCar, para el **fondo de garantía** (un tercio) | $ 8.000 |
| De lo de AutoCar, comisión de Mercado Pago (si se usa) | ~$ 1.800 |
| De lo de AutoCar, **neto por inspección** | **~$ 13.200** |

Todos estos números (porcentajes, montos y días) son **parámetros** que el admin cambia desde su panel, sin tocar código. Son los que juntamos en avisos y blogs: hay que validarlos con talleres reales.

**El fondo de garantía paga los reclamos.** Si un reclamo procede:

- Al comprador se le devuelven los $ 100.000 y se le paga una **compensación de hasta 3 veces el precio de la inspección** (en este ejemplo, hasta $ 300.000) o el costo del arreglo, lo que sea menor.
- **El mecánico paga una franquicia del 40 % de lo que cobró** (con $ 100.000, $ 30.800) y baja en el ranking.
- El fondo **solo paga reclamos**.

**¿Alcanza el fondo?** Un reclamo cuesta hasta ~$ 370.000 ($ 100.000 + $ 300.000 − $ 30.800 de franquicia). Con $ 8.000 por inspección, el fondo cierra si hay **menos de 1 reclamo que procede cada ~46 inspecciones**. Es un supuesto: si hay más, se sube la parte al fondo o se baja el tope (los dos son parámetros).

### Fuentes de ingreso

| Fuente | Qué es | Peso |
|---|---|---|
| **Inspección** | AutoCar se queda una parte del precio de cada inspección | **Principal** (desde el día 1) |
| **Comisión de los talleres** | Los talleres de la red pagan un 6 % por cada arreglo que les llega por AutoCar (idea A) | Secundaria (la plata está en la inspección) |
| **Suscripción del vendedor** | Prioridad de sus publicaciones (destacadas) y precio sugerido con tiempo estimado de venta | Secundaria (lo último que se hace) |
| **Informe para vender** | El vendedor paga una inspección y AutoCar asigna el mecánico | Secundaria (fase 2) |
| **Datos agregados** | Estadísticas anónimas de fallas por modelo para aseguradoras, financieras y casas de repuestos. Nunca datos personales ni patentes. | A futuro |

**Lo que no se cobra:** el metabuscador básico, la comparación de precio y las fallas típicas por modelo. Son lo que atrae a la gente y lo que la lleva a pedir una inspección.

### Planes

| Plan | Para quién | Precio (a validar) | Qué incluye |
|---|---|---|---|
| **Comprador** | Comprador | $ 0 | Sin plan pago (decidido el 14/11): metabuscador, búsquedas guardadas con avisos de novedades, comparación de precio, fallas típicas, pedir inspecciones (se paga cada una) |
| **Vendedor sin suscripción** | Vendedor | $ 0 | Publicar es gratis y sin límite |
| **Vendedor con suscripción** | Vendedor | A definir (parámetro) | Prioridad de sus publicaciones y precio sugerido con tiempo estimado de venta |
| **Taller adherido** | Mecánico | $ 0 | Recibe pedidos, cobra por AutoCar y aparece en el ranking |
| **Taller Pro** | Mecánico | $ 15.000 / mes | Agenda, panel de clientes y pedidos de presupuesto (fase 2). **No cambia la posición en el ranking.** |

### Sustentabilidad: cuándo se paga solo

Supuestos para el arranque en Mercedes y Luján. Hay que validarlos:

| | Por mes |
|---|---|
| Costos fijos: servidor y base pagos, dominio, Mercado Pago, publicidad local mínima | ≈ $ 600.000 |
| Neto por inspección (sin el fondo ni la comisión de Mercado Pago) | ~$ 13.200 |
| **Inspecciones para cubrir los costos** | **≈ 46** |
| Capacidad con 5 talleres haciendo 2 por semana cada uno | ≈ 40 |

Con los 5 talleres iniciales casi se cubren los costos: hace falta un taller más o que cada uno haga 3 por semana. Para crecer: más talleres por ciudad, la comisión por arreglos (idea A) y la suscripción del vendedor.

## Cómo crece

**El círculo:** más inspecciones → ranking más preciso y más datos de fallas por modelo → más confianza → más compradores y más talleres → más inspecciones.

**Por qué es difícil de copiar:**

- Una red de mecánicos con un historial de informes firmados y reclamos no se arma de un día para el otro.
- Los datos de fallas **medidas en autos reales**, modelo por modelo, no los tiene nadie en Argentina. Kavak los tiene, pero no los publica.
- Kavak, CarOne y Flash no pueden copiarlo sin dejar de ser los que venden o compran el auto.

| Fase | Qué incluye |
|---|---|
| **1. Lanzamiento** (lo que mostramos el 30/11) | Inspección por link con mecánico elegido por el comprador, informe firmado con patente e historial del auto, reclamo, fondo de garantía y ranking. Metabuscador con el botón "Mandale un mecánico" y alertas. **Fallas típicas por modelo** (idea B) y **costo total con 3 presupuestos** (idea A), con datos de prueba. 5 talleres de Mercedes y Luján |
| **2. Crecimiento** | Las ideas A y B con datos reales (fallas medidas en muchas inspecciones, presupuestos de toda la red). Cobro real con Mercado Pago y pagos al mecánico. Informe para vender y copia del informe al que compró el auto. Suscripción del vendedor |
| **3. Escala** | Más ciudades, datos agregados para aseguradoras y financieras, financiación con socios |

## Qué cambió respecto de la v3

| v3 | v4 | Por qué |
|---|---|---|
| Eje: "la publicación que se compara sola" (precio justo) | Eje: **el mecánico independiente que firma** | MercadoLibre ya tiene precios de referencia |
| Visión: referencia de precio justo del usado | Visión: que todo usado pase por un mecánico de AutoCar (solo usados) | El profe preguntó si era solo para usados |
| Solo autos publicados en AutoCar | **Cualquier auto de cualquier sitio** (link o metabuscador) | Arranca sin necesitar autos publicados |
| Garantía de 7 días con pago retenido | **Garantía del mecánico:** devolución, compensación y baja en el ranking | Funciona aunque la venta no pase por AutoCar |
| Papeles incluidos en el precio | El mecánico verifica motor y chasis contra la cédula, y le decimos al comprador qué trámites pedir | No hay una API pública del Registro para consultarlos |
| Ingreso principal: comisión por venta | Ingreso principal: **inspección** (y después la comisión de los talleres) | No hace falta que la venta pase por AutoCar |
| Comparador de precio como diferencial | Comparador como **dato** en el informe y en el metabuscador | Sigue sirviendo, pero no nos diferencia |
| Destacado por subasta | Queda para más adelante | No suma al eje nuevo |

Las versiones anteriores de la presentación están en el historial de git de esta carpeta.
