# Presentación unificada de Pulp

## Cambio de arquitectura

Se eliminaron `docs/index.html`, `docs/preview.css` y `docs/preview.js`. Eran una segunda interfaz simplificada y se habían desalineado respecto a la aplicación del ZIP. Pages ahora construye el `public/index.html` original, sus módulos `views.mjs` y `v4-ui.mjs`, sus tokens CSS y los recursos Pulp.

`runtime-mode.js` es falso en la aplicación normal y verdadero en el artefacto de presentación. `api.mjs` selecciona explícitamente el transporte local de ejemplos; nunca usa ejemplos para esconder fallos del backend normal. El build reemplaza `wallet.mjs` por un controlador que no registra extensiones ni firma. Además hay una lista positiva de acciones locales permitidas. Las acciones financieras no permitidas fallan también en la capa de datos, antes de cualquier red.

## Lo que se puede probar sin fondos

Navegación por las 24 secciones, menús responsive, temas, filtros, búsqueda, pestañas, selección de activos, favoritos, borradores de tokens, planes de distribución, exportación de metadata, reglas de alertas y estrategias como borradores, propuestas locales, notificaciones, componentes del UI kit y recursos de marca. Los cambios locales se guardan en el almacenamiento del navegador bajo `pulp:presentation:workspace:1`. «Reiniciar ejemplos» borra únicamente ese espacio de demostración.

AI Studio incluye cuatro vistas: editor con visibilidad de capas, calendario de muestra, moodboard con los recursos reales y brand kit. No se presenta como el editor creativo original ni genera imágenes, video o contenido automáticamente.

## Ajustes móviles

Normalización de controles para evitar color azul nativo de Safari; columnas flexibles con min-width:0; cabeceras sin pulpos superpuestos; formularios de una columna; tablas convertidas en tarjetas con etiquetas accesibles; menú con foco e interacción bloqueada detrás; espacios seguros para navegación inferior; tabs de Studio en dos columnas; imágenes optimizadas con proporciones estables; tres referencias de escenas faltantes resueltas con recursos de marca existentes.

## Datos y límites

La banda «Vista del producto» es permanente. Las wallets y el historial de muestra no son cuentas verificadas ni recomendaciones. El portfolio ilustra el diseño: no se debe interpretar como dinero disponible. No se consulta RPC, Jupiter, Helius, Pinata ni otro proveedor en esta presentación. Las claves de servicios no se solicitan. PULP no tiene precio ni contrato inventados.

No quedan enlaces al antiguo preview ni una landing alternativa publicada en lugar de la aplicación. La historia de Git conserva las versiones anteriores, como corresponde; no se ha reescrito ni eliminado.

## Comprobación de esta entrega

117 pruebas de lógica/servidor/build aprobadas. Revisión de 24 rutas a 320, 375, 390, 430, 768, 1024 y 1440 px: 168 combinaciones sin desbordamiento horizontal de página, imágenes rotas ni paneles de error. Se revisaron además 198 controles de bloqueo/navegación/interacción y 12 recorridos de formularios locales, todos aprobados.

Pruebas de navegador con Chromium en Linux. El entorno de revisión no permite navegar a localhost, por lo que se ejecutó el artefacto compilado con un harness que carga los recursos locales en memoria y rechaza red saliente. No se probó un iPhone físico ni Safari. Estos resultados no equivalen a una garantía de ausencia de errores en todos los dispositivos ni a una auditoría financiera.

## Publicación

El workflow `.github/workflows/pages.yml` ejecuta `npm run check`, `npm test` y `node scripts/build-pages.mjs` antes de subir `_site/`. Un fallo impide publicar la nueva revisión. `build-info.json` identifica el commit y el modo servido. Tras publicar, el workflow comprueba por HTTPS el commit servido, los recursos esenciales y el tipo MIME del módulo principal.
