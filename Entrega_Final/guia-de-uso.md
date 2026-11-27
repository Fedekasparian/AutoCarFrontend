# Guía de uso · AutoCar

## Del aviso a la decisión de compra

| Quién | Qué hace | Qué puede comprobar |
|---|---|---|
| Comprador | Abre **Explorar** para ver publicaciones de particulares y concesionarias adheridas, o **Búsquedas** para comparar avisos de otras plataformas. | En cada resultado puede identificar de dónde viene el aviso. |
| Comprador | En un aviso elige **Mandale un mecánico**, compara zona, precio y experiencia del taller con ese modelo y confirma el pedido. | En **Mis inspecciones** ve el estado y el importe. Con Mercado Pago activo, completa el checkout para que el mecánico pueda tomar el pedido. |
| Mecánico y vendedor | El taller acepta y propone un turno. En una publicación de AutoCar el vendedor puede confirmarlo. | El comprador puede seguir el turno desde el detalle. |
| Mecánico | Carga el checklist, los hallazgos, la patente y las fotos. Revisa el borrador y firma. | El informe queda con conclusión, nombre del profesional, fecha y huella de su contenido. |
| Comprador | Abre el informe y compara los presupuestos recibidos con el precio del auto. | Puede decidir si compra, negocia el precio o sigue buscando. |
| Publicador | Desde su cuenta publica y administra sus vehículos. Una concesionaria aprobada también consulta su panel. | El aviso puede mostrar **Verificado** si la última inspección vigente fue recomendable y siguen coincidiendo los datos revisados. El informe personal queda privado. |
| Administrador | Abre **Estadísticas**, elige un período y consulta **Plata**, **Recomendaciones** o **Metabuscador**. | Distingue comisiones de inspección, liquidaciones de clics y abonos cobrados. En el recorrido del usuario, «compró» significa que pagó la inspección. |

## Qué recibe el comprador

El servicio que paga es **la inspección antes de comprar el auto**. La tarifa se reparte entre el mecánico y AutoCar según la comisión vigente al pedirla. El comprador elige quién inspecciona. Si el profesional registra una falla, queda vinculada al ítem y al auto revisado. Al firmar, el sistema pide cotizaciones para los arreglos a **otros talleres**. Cada taller puede responder con un importe y una vigencia. El comprador decide aparte si encarga el trabajo.

Por ejemplo, si el informe señala desgaste en los frenos, el comprador ve qué observó el mecánico y cuánto presupuestan otros talleres para ese arreglo. AutoCar suma al precio publicado el presupuesto vigente más bajo de cada ítem. Si falta alguna cotización, indica que el cálculo es parcial. Las **fallas típicas** ayudan antes de revisar un auto concreto. Están agrupadas por marca y modelo, distinguen aportes de mecánicos y fuentes publicadas, y muestran frecuencias observadas cuando hay suficientes inspecciones firmadas.

## Qué cambió desde la E4

En la E4 se proponía que un reclamo posterior a la compra terminara en una compensación con un fondo. El 23/11 el equipo retiró ese flujo porque el informe documenta lo observado el día de la revisión y el equipo carece de evidencia para determinar cuándo apareció una falla denunciada después. El servicio final entrega el informe antes de que el comprador decida. Las devoluciones previstas por una inspección cancelada, rechazada o que no se pudo hacer siguen su propio flujo. Las migraciones 034 y 035 registran la eliminación del fondo y de la consulta de informes anteriores por patente, respectivamente. La insignia de la publicación comunica el resultado vigente sin revelar el informe.

## Preparar la demostración

Abrir [Mis inspecciones en desarrollo](https://autocar-git-dev-autocar4.vercel.app/front/pages/talleres/mis-inspecciones.html) con una cuenta compradora y un taller aprobado, en sesiones separadas. Abrir un aviso de otro usuario, anotar el número de la inspección y confirmar el pago de prueba antes de pasarle el turno al taller. Para preparar el checkout, la vuelta al detalle y las verificaciones, ver **docs/demo-pago.md** en el [repositorio de la API](https://github.com/MateoPonti/AutoCarBackend). También se puede abrir una inspección ya firmada para mostrar la lectura del informe mientras se reciben presupuestos.
