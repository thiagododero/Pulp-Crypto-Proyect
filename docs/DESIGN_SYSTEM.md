# Pulp White Edition / Design System 4.0

## Fuente de verdad

`public/css/tokens.css`: paleta semántica, espaciado, radios, sombras, motion y temas.
`public/css/components.css`: componentes compartidos (botones, campos, diálogos, tablas, estados).
`public/css/app.css`: composiciones y breakpoints de las pantallas.
`public/assets/design-tokens.json`: exportación de valores del sistema.
`public/js/views.mjs`: plantillas semánticas de las rutas y biblioteca viva.

La app arranca en blanco. La preferencia se guarda en `pulp:white:theme`, separada de la edición oscura anterior. Modo oscuro opcional, no un filtro de inversión.

## Dirección de marca

Blanco y lavanda para superficies. Violeta para acciones y navegación. Renders sólidos con luz suave; sin fondos galácticos, transparencias de cristal ni glows sobre los datos. Tipografía nativa del sistema: no se distribuyen fuentes ni se descargan desde una CDN.

Las ilustraciones son PNG/WebP transparentes con apariencia 3D, no modelos interactivos. El símbolo original Pulp continúa en SVG. Los renders no llevan texto financiero ni controles incrustados.

## Retícula

Sidebar 226 px; topbar 80 px; contenido máximo 1440 px. Espaciado 4/8/12/16/20/24/32/40/48/64. Radios 6/10/14/20/28. Breakpoints principales 580/800/1050/1250/1700 px. En móvil, navegación inferior para Inicio, Radar, Swap, Launchpad y Portfolio; el resto permanece en el menú.

## Componentes y estados

Primario, secundario, ghost, destructivo, disabled y loading. Inputs con etiqueta, descripción y error. Tabs con navegación por flechas. Modales con gestión de foco y cierre con Escape. Menú móvil con foco acotado. Avisos con texto, tono e icono. Tablas con scroll contenido (nunca horizontal de toda la página).

Estados financieros: pendiente/enviada, confirmada/finalizada, fallida, resultado incierto. Una transacción enviada no se presenta como confirmada. No se repite un envío automáticamente por un timeout.

## Datos

“—” significa desconocido/no consultado, no cero. Los balances proceden del RPC. Los precios se indican con fuente y fecha. Las muestras del portfolio se guardan solo cuando se observan, no se rellenan hacia atrás y no se presentan como PnL. Las tablas de ejemplo del kit no muestran precios inventados.

## Accesibilidad

Foco visible. Controles táctiles amplios. Respeto por `prefers-reduced-motion`. Colores semánticos con texto. Se verifican pares de contraste del sistema y recorridos de teclado; eso no equivale a una auditoría completa o certificación WCAG. Revisar lector de pantalla y Safari en dispositivos reales antes de una beta pública.

## Uso

Abrir `Abrir-UI-Kit.command` o entrar a `#/ui-kit`. La biblioteca usa los mismos botones, tarjetas, inputs y modales que la aplicación. El ejemplo de Swap del kit está marcado `inert`; no puede firmar ni ejecutar operaciones.

No es un archivo nativo de Figma. Los SVG y tokens son reutilizables por un equipo de diseño o desarrollo.


## Extensión de producto 4.0

`public/js/v4-ui.mjs` reutiliza los helpers de `views.mjs`; `public/css/v4.css` añade layouts del radar, alertas, estrategias, liquidez, Launch Studio, Squads, pagos y operación. No reemplaza la paleta semántica. Todas las escrituras financieras siguen la revisión compartida del core. Los avisos experimentales no se ocultan detrás de un color o un tooltip.
