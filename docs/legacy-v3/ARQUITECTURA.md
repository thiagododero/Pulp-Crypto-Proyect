> Documento heredado de White Edition 3.0. Para el estado actual usar `v4/ALCANCE_15_PUNTOS.md` y `v4/CONFIGURACION.md`.

# Arquitectura de esta entrega

## Runtime

Node sin dependencias de npm. `server.mjs` sirve archivos públicos y una API con validación de Host/Origin. Escucha solo en localhost. El lanzador selecciona puerto, reutiliza la misma versión y abre app, UI kit o sitio según el acceso elegido.

Frontend sin framework ni proceso de build. `public/js/app.mjs` administra estado/acciones; `views.mjs` genera vistas a partir de recursos reales; `api.mjs` es el cliente de API; `wallet.mjs` descubre proveedores Wallet Standard y solicita firmas. `ui.js` aporta iconos y componentes primitivos.

## Backend

`server/service.mjs` conecta sesión/perfil, RPC, Jupiter, preparación, revisión y confirmación. `security.mjs`, `builders.mjs`, `validate-earn.mjs` y `shared/solana.mjs` conservan sus responsabilidades de la beta. `snapshots.mjs` registra exclusivamente valores observados de la cuenta autenticada.

Configuración, datos y logs no se sirven como archivos públicos. `tests/` contiene proveedores inyectados y claves efímeras, nunca es una importación del servidor normal.

## Diseño

Tres hojas: `tokens.css` → `components.css` → `app.css`. No CSS Octo superpuesto. Asset manifest con seis ilustraciones en PNG/WebP, logo e iconos vectoriales. Los tokens de JSON exportan las mismas variables CSS de ambos modos, sin afirmar ser un archivo nativo de Figma.

## Extender sin romper la seguridad

No mezclar los resultados de una consulta con permisos de firma. Conservar el estado `unknown` ante un envío incierto. No ampliar silenciosamente programas/instrucciones admitidos. No persistir private keys ni usar el agente IA para firmar.

Para una plataforma pública se necesita una arquitectura de operación distinta: roles administrativos, aislamiento de cuentas, base de datos, gestión de secretos, HTTPS, límites y monitoreo. La guía de lanzamiento describe esas dependencias; no están sustituidas por esta entrega local.
