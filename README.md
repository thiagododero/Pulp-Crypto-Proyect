# Pulp Crypto · White 4.2.1

Plataforma cripto con tema blanco/violeta, ilustraciones originales y un sistema de componentes compartido. Incluye el rediseño de Radar, Launchpad, Portfolio, Actividad, Swap, Earn y Liquidez. **AI Studio y el estudio creativo fueron retirados.**

## Probar online

**[Abrir Pulp](https://thiagododero.github.io/Pulp-Crypto-Proyect/?v=4.2.1#/home)**

El código de la versión 4.2.1 está incorporado en `main`, en el commit [`2c4b4aa`](https://github.com/thiagododero/Pulp-Crypto-Proyect/commit/2c4b4aab60f986423a43c9e3fa5c07d48394c1dc). La publicación y sus verificaciones se consultan en [GitHub Actions](https://github.com/thiagododero/Pulp-Crypto-Proyect/actions/runs/42895176298).

No hace falta descargar el ZIP ni ejecutar comandos para recorrer la web. GitHub Pages muestra la interfaz completa en modo presentación: **wallets, firmas, pagos y ejecución financiera están deshabilitados**. Los datos de muestra y borradores son locales y están identificados discretamente en la interfaz; no son cotizaciones ni recomendaciones.

## Alcance cripto

- Radar con filtros, períodos, favoritos, vistas guardadas, comparador y perfiles de wallets.
- Launchpad con identidades de proyecto, estados, fichas y asistente de cuatro pasos.
- Swap concentrado en su acción principal; catálogos y detalles de Earn y pools.
- Portfolio con evolución, distribución, activos y posiciones; actividad interpretada y filtrable.
- Alertas, estrategias, consultas de gobernanza y borradores locales.
- Preferencias separadas de conexiones del operador; navegación agrupada, móvil y teclado.
- UI kit técnico, recursos de marca y 25 rutas. No contiene una sección de diseño creativo pendiente.

No se emitió PULP ni se habilitaron operaciones reales. El backend de la beta se conserva, con sus límites, sin presentarlo como un servicio financiero público auditado.

## Una sola interfaz

`public/` es la fuente única de UI. `scripts/build-pages.mjs` genera `_site/` para GitHub Pages con los mismos módulos y recursos. No hay otro frontend manual en `docs/`.

El proceso de construcción de Pages sustituye el controlador de wallet por uno inerte y utiliza un transporte explícito de presentación. Los archivos del servidor, credenciales y datos privados no se publican como parte de `_site/`. El backend permanece en `server/`, `server.mjs` y `shared/`.

## Abrir localmente en Mac

Con Node.js 20.11 o superior, descargá el repositorio y abrí **`Ver_Pulp.command`**. El lanzador construye la presentación, busca un puerto disponible y abre el navegador. No requiere `npm install` ni cuentas de proveedor. Dejá la Terminal abierta mientras lo usás.

Si macOS bloquea el doble clic, revisá su procedencia y usá clic derecho → Abrir, o ejecutá `bash ` seguido del archivo arrastrado a Terminal. No desactives protecciones globales del sistema.

**`Abrir.command`** conserva el modo local conectado de la beta anterior: requiere configuración propia y validación independiente. Para revisar el diseño usá **`Ver_Pulp.command`**. Nunca ingreses frases semilla ni claves privadas.

## Desarrollo y publicación

```bash
npm run check
npm test
npm run build:pages
```

Las pruebas Node incluidas no requieren instalar dependencias nuevas. Al modificar la interfaz en `main`, el workflow [Publicar Pulp · interfaz unificada](https://github.com/thiagododero/Pulp-Crypto-Proyect/actions/workflows/pages.yml) ejecuta las pruebas, construye y publica Pages, y verifica el commit servido, recursos y tipo MIME de los módulos.

`Publicar_en_GitHub.command` es el actualizador del ZIP original contra una revisión antigua. **No es necesario para esta publicación ni para trabajar desde un clone actualizado.** Por seguridad se detiene si la rama ya cambió.

## Verificación y límites

La incorporación del paquete cotejó los hashes de 200 archivos y ejecutó 152 pruebas de código/servidor/construcción. Los detalles de publicación están en [PUBLICACION.md](PUBLICACION.md). Los manifiestos de integridad describen el ZIP original; la documentación de publicación se actualiza después del envío.

Las pruebas visuales anteriores utilizaron Chromium offline, no Safari ni iPhone físico. No se realizó auditoría financiera independiente ni operaciones con fondos reales. Ver [alcance y pruebas](docs/PRODUCT_REFINEMENT.md); sus notas de falta de publicación corresponden al momento de preparación del ZIP, anterior al envío actual.

## Datos privados

No publiques `.env`, claves, backups ni datos de usuarios. El servidor conectado guarda sus datos fuera del repositorio, en PulpBeta dentro de tu usuario. No ejecutes varias versiones conectadas sobre el mismo directorio a la vez. El servidor de presentación local es de solo lectura y escucha en loopback.
