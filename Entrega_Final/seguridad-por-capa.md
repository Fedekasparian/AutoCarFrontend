# Seguridad por capa · Entrega final

| Capa | Qué se controla | Dónde comprobarlo |
|---|---|---|
| Navegador y proxy | La interfaz consume `/api` en su propio origen. La política de contenido limita scripts, conexiones, imágenes y marcos. Preview y producción seleccionan el destino por configuración. | Front, `vercel.json` y `middleware.js`. |
| Transporte y servidor | Los despliegues usan HTTPS. El back restringe los orígenes con `FRONT_URL`, registra los errores internamente y responde con JSON. Las credenciales se configuran en el entorno del servidor. | Back, `src/bootstrap.php`, `src/Core/Cors.php`, `Dockerfile` y `.env.example`. |
| Identidad y acceso | La cookie contiene el identificador de sesión; la sesión y los permisos se consultan en el servidor. Las operaciones protegidas que modifican datos requieren token CSRF. El ingreso limita los intentos por correo. | Back, `src/Auth`, `src/Core/Middleware.php` y `src/routes.php`. |
| Negocio | El comprador pide su inspección, el mecánico asignado escribe y firma, y otro taller cotiza. El administrador y el moderador tienen permisos específicos. Los campos inválidos del checklist se rechazan antes de guardar. Un informe firmado queda bloqueado para edición. | Back, `src/Inspecciones` y pruebas de integración del informe y sus permisos. |
| Persistencia | PostgreSQL conserva relaciones, restricciones de montos y un índice único para el pedido en curso de cada comprador y aviso. El informe guarda la huella del contenido firmado. Los datos de otras plataformas se leen desde el servidor. | Back, `database/schema.sql`, `src/Inspecciones/Huella.php` y `src/MetaBusqueda`. |
| Checkout | Mercado Pago recibe el pago. El servidor guarda la orden vinculada a la inspección y consulta su estado al proveedor al volver del checkout o recibir el aviso. El taller puede aceptar después de confirmarse el cobro. | Back, `src/Pagos` y `src/Inspecciones/MecanicoController.php`. |

La insignia **Verificado** es pública. El informe con las observaciones y fotos está sujeto a los permisos de la inspección. Desde el 23/11, el alcance del servicio termina en la inspección precompra y sus presupuestos. La decisión sobre reclamos está documentada en la [guía de uso](guia-de-uso.md).
