# Pulp · White Edition

**Un proyecto, una interfaz.** La aplicación vive en `public/`; GitHub Pages se construye desde esos mismos componentes, estilos e ilustraciones. No existe una segunda aplicación en `docs/`.

## Abrir la presentación

https://thiagododero.github.io/Pulp-Crypto-Proyect/

La publicación incluye las 24 secciones de la interfaz. Los saldos, wallets y actividad son **ejemplos identificados**, no consultas financieras. Se puede navegar, filtrar, abrir fichas, editar borradores, guardar favoritos y probar formularios locales. No se conectan wallets ni se solicitan firmas. El controlador de wallets se reemplaza por un módulo inerte durante el build.

El token oficial PULP no fue emitido. AI Studio muestra editor, capas visibles, calendario, moodboard y brand kit; generación, guardado de proyectos creativos y publicación siguen deshabilitados.

## Una sola fuente

- `public/`: frontend compartido por la aplicación y la presentación.
- `shared/`: validadores y utilidades comunes.
- `server.mjs` y `server/`: backend original, conservado para desarrollo.
- `scripts/build-pages.mjs`: copia la interfaz a `_site/`, activa el transporte de presentación y elimina el controlador financiero del artefacto publicado.
- `public/js/presentation-api.mjs`: datos y operaciones locales de muestra, sin acceso a proveedores. No se activa como fallback ante errores del backend.
- `docs/`: documentación, no un frontend alternativo.

## Construir y comprobar

Requiere Node.js 20.11+; no necesita `npm install`.

```bash
npm run check
npm test
npm run build:pages
```

GitHub Actions ejecuta las pruebas y publica `_site/` automáticamente. Los assets usan rutas relativas compatibles con el subdirectorio del repositorio. Los CSS/JS de entrada se versionan en cada despliegue.

## Aplicación local con backend

```bash
node server.mjs --open
```

También se puede usar `Abrir.command` en Mac. El servidor local conserva sus integraciones anteriores y requiere configuración de proveedores. **No es el modo de presentación publicado** y no está auditado para manejar fondos. No introducir seeds ni claves privadas. Ver `LEEME_PRIMERO.md` y `docs/v4/OPERACION_Y_SEGURIDAD.md`.

## Alcance de la presentación

Inicio, Intelligence, Pulp Swap / Earn, Launchpad, Portfolio, Actividad, Token y Tesorería, Gobernanza, AI Studio, UI Kit, Visuales, Estado, Ayuda, Ajustes, Explorador de wallets, Alertas, Estrategias, Liquidez, Launch Studio, LaunchLab, Gobernanza on-chain, Planes, Seguridad de cuenta y Operaciones.

Se usan datos de ejemplo para mostrar paneles completos. No son recomendaciones de wallets, predicciones de retorno ni contratos desplegados. Las acciones financieras, emisión, publicación on-chain, cobros y credenciales permanecen deshabilitadas en Pages.

Ver [documentación de la presentación](docs/PRESENTACION.md) y [reporte de revisión](docs/PRESENTACION_QA.json).
