# Despliegue controlado — no ejecutado en esta entrega

Hay código para un despliegue de **una instancia Node**, con cuentas por wallet y persistencia PostgreSQL/Supabase. No es una arquitectura horizontal terminada para miles de operadores. Sesiones, planes sin enviar y algunos bloqueos están en memoria de esa única instancia. Reiniciar revoca sesiones y planes pendientes, pero no transacciones ya enviadas.

## Preparar una instancia propia

Crear un proyecto Supabase y ejecutar `deploy/001_storage.sql` mediante su editor SQL. La tabla `pulp_kv` y las funciones están cerradas a los roles anónimo y autenticado; únicamente el backend usa service_role. Los permisos por usuario se comprueban también en las rutas del servidor. No entregar esta clave al frontend.

Completar `.env` con `PULP_PUBLIC_ORIGIN=https://app.tudominio`, `PULP_ADMIN_WALLET`, `PULP_SUPABASE_URL`, `PULP_SUPABASE_SERVICE_KEY`, `PULP_ENCRYPTION_KEY`, proveedores y direcciones reales. Generar 32 bytes criptográficos propios para el cifrado: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Guardarlos en un gestor de secretos; no incluirlos en respaldos públicos ni cambiarlos sin migración.

Para Compose, agregar `PULP_DOMAIN=app.tudominio` y `ACME_EMAIL=tu-correo`. Configurar DNS y permitir únicamente los puertos del proxy. El hostname debe coincidir exactamente con el origen HTTPS de Pulp.

```sh
node --env-file=.env scripts/preflight.mjs
npm test
npm run check
docker compose --env-file .env -f deploy/compose.yml config --quiet
docker compose --env-file .env -f deploy/compose.yml up --build -d
```

Los comandos Docker son **instrucciones de despliegue, no evidencia de un despliegue realizado**. Este entorno no ejecutó Docker, Caddy, ACME ni una base Supabase real. Fijar imágenes a versiones/digests revisados antes de producción; el ejemplo usa familias Node22 y Caddy2.

## Límites del proxy y operación

Compose no publica el puerto de Node. Solo el proxy debe alcanzarlo. Caddy sobrescribe Host y X-Real-IP y termina TLS. `PULP_TRUST_PROXY=1` es correcto únicamente si el backend no es accesible directamente. No añadir otra capa de proxy sin revisar IPs y cabeceras confiables.

No arrancar dos réplicas, no usar el CLI de auto-puerto en nube y no conectar varias instancias al mismo almacén. PostgreSQL usa CAS para mutaciones, pero eso no convierte sesiones/planes en distribuidos. No hay instalación Kubernetes, autoscaling o failover multi-región.

El proceso verifica configuración, descifrado y acceso al almacén al arrancar. Las caídas de proveedores se reflejan como errores, no datos sintéticos. `/api/health` identifica el proceso: no certifica RPC, mercado, liquidez, firma de wallet ni disponibilidad de todas las integraciones. Usar además Estado y conexión, logs privados y alertas del hosting. No registrar bodies de autenticación, secretos o transacciones en un proxy público.

## Migrar datos

No se sincroniza automáticamente el directorio local con Supabase. Empezar con un entorno vacío o realizar una migración controlada con respaldo, exportación/revisión de claves y desactivación del proceso anterior. No copiar una configuración cifrada sin su clave de cifrado. No se incluye un importador automático irreversible.

## Requisitos antes de abrir al público

Revisar protocolos financieros de manera independiente, validar extensión y dispositivos reales, transacciones pequeñas controladas en cada red/protocolo habilitado, pruebas de restauración y acuerdos de proveedores. Revisar requisitos aplicables a las actividades y mercados atendidos. No presentar el ZIP, sus tests o su design system como una auditoría financiera o licencia.
