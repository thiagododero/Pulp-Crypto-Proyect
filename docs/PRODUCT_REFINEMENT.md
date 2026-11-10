# Pulp Crypto 4.2.1 · Rediseño basado en la comparativa

## Estado de entrega

Código preparado el 9 de noviembre de 2026 sobre `thiagododero/Pulp-Crypto-Proyect`, referencia `d3508c59564a4e76f181a18ea69f92365fec798a`.
**Este paquete no fue subido a GitHub ni desplegado por el asistente.** La conexión disponible durante esta entrega expuso lectura, no escrituras. El actualizador incluido utiliza exclusivamente la autenticación Git del usuario en su Mac, previa confirmación.

Una sola fuente de interfaz: `public/`. `scripts/build-pages.mjs` produce `_site/` con los mismos módulos y un transporte de presentación explícito. No existe otra interfaz manual en `docs/`. El backend de la beta se conserva; no se lanzaron tokens ni se movieron fondos.

## Lo que se implementó

| Área | Recorrido y cambios |
|---|---|
| Navegación | Grupos Explorar, Tu espacio, Comunidad, Crear, Cuenta, Administración y Recursos; Earn separado del intercambio; configuración del operador separada de preferencias. |
| Inicio | Valor observado de wallet, gráfico, accesos, radar personal, actividad y distribución por delante de la portada de marca. |
| Radar / Intelligence | Tabla de resultados, búsqueda, estilos, ordenamiento, períodos 7/30/90 días, favoritos, vistas guardadas, comparación de hasta tres perfiles y metodología. |
| Perfil de wallet | Ficha analítica, cobertura, movimientos y activos; pestañas y regreso conservando los filtros. Los nombres y resultados de muestra no identifican inversores reales. |
| Swap | Una tarjeta central de intercambio; conserva el selector de activos, inversión del par y configuración. Cotizar, conectar y firmar están deshabilitados en presentación. |
| Earn | Catálogo filtrable y ordenable, favoritos, detalle del mercado, gráfico ilustrativo, origen del rendimiento y riesgos; posiciones por separado. |
| Liquidez | Catálogo por par, protocolo y tipo; detalles y posiciones. CPMM se presenta como reservas, no como un editor de rangos CLMM. CLMM/DLMM no afirman ejecución implementada. |
| Launchpad | Catálogo de proyectos con identidades geométricas propias, búsqueda, estados y favoritos; ficha de proyecto con ciclo de vida. |
| Crear proyecto | Asistente de cuatro pasos: identidad, distribución, calendario y revisión. Validación de asignación del 100%, suministro, fechas y enlaces. Guardar, editar, exportar y eliminar borradores locales con confirmación. |
| Portfolio | Resumen, evolución del valor observado, distribución; pestañas de activos, posiciones y actividad. No equipara depósitos con rentabilidad. |
| Actividad | Timeline por día, filtros de tipo/estado/activo/período, detalle de eventos y exportación. Sin firmas ni comprobantes blockchain inventados. |
| Alertas y estrategias | Formularios locales, validación, persistencia y eliminación. Guardar una regla no activa un worker ni envía mensajes externos. |
| Gobernanza | Catálogo y ficha de consultas, creación de borradores; no se habilitan votos financieros, ejecución de DAO ni propuestas con fondos. |
| Token | PULP no emitido; sin precio, suministro real, market cap o liquidez fingidos. La lectura configurada del backend original se conserva. |
| UI kit | Componentes compartidos para filtros, tablas/cards, gráficos accesibles, fichas, formularios, vacíos y estados deshabilitados; tokens actualizados. |
| Otros módulos | Se mantienen facturación, seguridad, operaciones, conexiones, ayuda, estado, visuales en el mismo árbol de navegación. La administración permanece diferenciada de las tareas de usuario. |

## Interacciones y límites

Los datos de presentación son locales y están identificados de forma discreta en el pie y los paneles relevantes. Las cifras de las capturas no son cotizaciones reales ni recomendaciones. No se intenta descubrir una wallet real ni firmar. El controlador publicado rechaza conexión, firma y envío; los endpoints de preparación también fallan cerrados. No se eliminan las protecciones para obtener un aspecto más comercial.

La nueva presentación tiene **25 rutas**. El producto queda limitado al ecosistema cripto. No se añadió copy trading desatendido, vaults, recompras, lanzamiento PULP ni una infraestructura pública financiera.

En modo conectado se conserva el backend existente y sus límites. Las pantallas no sustituyen errores de proveedores por datos de ejemplo. Las rutas de ejecución añadidas en versiones anteriores siguen siendo experimentales: este rediseño no certifica integraciones ni habilita movimientos con dinero real.

## Comprobaciones de esta revisión cripto

Se retiró el módulo creativo de la interfaz, navegación, rutas, scripts, estilos, landing y capacidades. El planificador de lanzamientos se conserva con el nombre «Plan de lanzamiento».

- 152 pruebas Node de lógica, servidor, build, protecciones y actualización con Git simulado.
- 71 comprobaciones de interacciones de producto y 56 comprobaciones de alcance cripto y navegación (127 en total).
- Se recorrieron las 25 rutas a 390 y 1440 px, sin encontrar imágenes rotas, errores JavaScript o desbordes de página en esas comprobaciones.
- Se comprobaron el enlace antiguo del módulo retirado, el buscador, el menú móvil, el planificador de token y el bloqueo de wallets y swaps.
- Se verificó que el actualizador puede retirar archivos con hashes esperados y se detiene ante cambios remotos o rutas inseguras.

**Método:** Chromium local con los mismos módulos compilados, estilos y assets de la aplicación en un arnés offline. Sin red, wallets ni fondos. No equivale a Safari, Mac/iPhone físicos ni una publicación remota. Los tests de publicación usan Git simulado y no autentican un push.

## Archivos y mantenimiento

`product-model.mjs` concentra los fixtures explícitos, validaciones y filtros. `product-widgets.mjs` contiene componentes compartidos. `product-ui.mjs` aporta las vistas dentro del renderer original. `product.css` extiende los tokens de la edición White. Las vistas anteriores que siguen prestando funciones se conservan como soporte de backend, no como una segunda web.

No se incluyeron credenciales, wallets privadas ni fuentes tipográficas. Cerrar la vista previa no altera blockchain. Los borradores visuales solo residen en el navegador; no sustituyen una base de datos multiusuario.

## Criterio de producto

El rediseño incorpora patrones observados en la comparativa: descubrimiento antes que configuración, información comparable, detalle sin perder contexto, una acción principal por pantalla y una jerarquía distinta para catálogo, operación y administración. Decir que supera a todos los competidores requeriría evaluación con usuarios; no es una conclusión demostrada por estas pruebas.
