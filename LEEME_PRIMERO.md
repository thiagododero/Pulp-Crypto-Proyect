# Pulp Crypto · White 4.2.1

Rediseño de producto sobre **el mismo Pulp Crypto**, con tema blanco/violeta, recursos originales y UI kit compartido. Radar, lanzamientos, cartera, actividad y DeFi se reorganizaron a partir de la comparativa visual.

**Entrega local preparada, no publicada en GitHub por el asistente.** La conexión disponible en esta sesión no permitió escribir commits. El repositorio de destino sigue siendo `thiagododero/Pulp-Crypto-Proyect`; no se creó otro.

## Ver la aplicación

1. Descomprimí toda la carpeta.
2. Con Node.js 20.11 o superior instalado, hacé doble clic en **`Ver_Pulp.command`**.
3. Mantené la Terminal abierta. Se construye la vista desde `public/`, elige un puerto libre y abre el navegador.

No requiere `npm install`, una cuenta de proveedor ni una wallet. Esta ruta abre la presentación: **conexiones, firmas, pagos y ejecución financiera están deshabilitados**. Los ejemplos y borradores son locales y están identificados discretamente en la interfaz.

Si macOS impide el doble clic, revisá su procedencia y usá clic derecho → Abrir, o ejecutá `bash ` seguido del archivo arrastrado a Terminal. No desactives protecciones globales del sistema.

## Actualizar el mismo GitHub y Pages

**`Publicar_en_GitHub.command`** prepara una copia nueva del repositorio usando Git de tu Mac. Requiere tus credenciales de Git configuradas (la conexión de ChatGPT no las transfiere).

El script verifica que `main` siga en la revisión examinada, valida los hashes de los archivos listados en `UPDATE_MANIFEST.json`, aplica solamente esos cambios y retira los archivos enumerados en `deletedFiles` y ejecuta las pruebas. Antes de crear el commit y subirlo te pide escribir **`PUBLICAR`**.

No hace force push, no cambia permisos, no crea repositorios, no sube claves y no lanza PULP. Si detecta commits nuevos, se detiene sin sobrescribir nada. El paquete sigue siendo utilizable localmente aunque la actualización remota se detenga.

Después de un push exitoso, el workflow existente construye Pages desde la misma interfaz. Comprobá la publicación en:
https://github.com/thiagododero/Pulp-Crypto-Proyect/actions/workflows/pages.yml

La URL seguirá siendo:
https://thiagododero.github.io/Pulp-Crypto-Proyect/

**La web actual no cambia hasta que se envíe y publique el commit.** No se probó un push autenticado con este paquete.

## Alcance exclusivo cripto

Se retiraron el estudio creativo, editor por capas, calendario de marketing, moodboard y su contrato de integración. El UI kit técnico y los recursos de marca permanecen: sostienen el diseño de la aplicación cripto, no son una herramienta de diseño para clientes.

## Qué contiene

- Radar con filtros, períodos, favoritos, vistas guardadas, comparador y perfiles.
- Launchpad con identidades de proyecto, estados, fichas y asistente de cuatro pasos.
- Swap concentrado en su acción principal; catálogos y detalle de Earn/pools.
- Portfolio con evolución, distribución, activos y posiciones; actividad interpretada con filtros.
- Alertas, estrategias, consultas de gobernanza y borradores locales.
- Preferencias separadas de conexiones del operador; navegación agrupada y UI kit actualizado.
- Recursos 3D originales, móvil, teclado, tema claro/oscuro y 25 rutas.

Ver [alcance, pruebas y límites del rediseño](docs/PRODUCT_REFINEMENT.md).

## Código y modos

`public/` es la única fuente de UI. `_site/` es **salida generada** para presentación y no se edita manualmente. `node scripts/build-pages.mjs` la regenera. El backend se conserva en `server/`, `server.mjs` y `shared/`.

**`Abrir.command`** conserva el modo local conectado de la beta anterior. Ese modo necesita configuración propia y no está certificado para operar fondos. Para revisar este rediseño usá **`Ver_Pulp.command`**.

El producto queda exclusivamente enfocado en cripto. No contiene un módulo de diseño creativo pendiente. No se emitió PULP, no se conectaron wallets reales ni se añadieron vaults/recompras/copy trading desatendido. Las capacidades previas del backend siguen sujetas a revisión y validación real.

## Pruebas

```bash
npm run check
npm test
npm run build:pages
```

Las pruebas Node incluidas no requieren paquetes nuevos. La verificación UI adicional requiere herramientas de desarrollo opcionales: TypeScript, Python Playwright y Chromium. Ver `tests/product-browser.py` y el método explicado en `docs/PRODUCT_REFINEMENT.md`.

No se ejecutaron Safari/iPhone físicos, auditoría independiente ni operaciones con fondos. El reporte de QA describe lo observado, no garantiza ausencia universal de errores.

## Datos privados

No publiques `.env`, claves, backups ni datos de usuarios. El servidor conectado conserva sus datos fuera del proyecto en el directorio PulpBeta de tu usuario. No ejecutes versiones conectadas distintas sobre el mismo directorio a la vez. El servidor de presentación es de solo lectura y escucha exclusivamente en loopback.
