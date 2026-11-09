# 🐙 Pulp Crypto — White Edition 4.0

Proyecto Web3 en Solana con diseño blanco/violeta: Intelligence, Pulp Swap, Trade & Earn, Launchpad, Portfolio, token, tesorería y gobernanza.

**Estado:** Beta de integración. El token oficial PULP no se emitió. AI Studio permanece en construcción.

## Vista previa online

Se agregó una **vista previa estática e ilustrativa** en `docs/index.html`. Para verla como web desde GitHub, activá GitHub Pages usando **GitHub Actions** en `Settings → Pages` (la disponibilidad depende de las condiciones del repositorio privado). GitHub **no** ejecuta el backend de Node; las conexiones reales requieren un despliegue separado y una configuración segura.

## Código completo (Pulp 4.0)

El paquete fuente entregado en ChatGPT es `Pulp_4_White_Beta_Mac.zip`. El código completo todavía necesita sincronizarse desde ese paquete a este repositorio con el archivo `Subir-a-GitHub.command` del paquete preparado para GitHub. Esto evita publicar accidentalmente datos locales, claves de proveedores o archivos de respaldo.

Para subirlo desde Mac:
1. Descomprimí el paquete preparado para GitHub.
2. Abrí `Subir-a-GitHub.command`, que verificará los archivos y utilizará tu autenticación de GitHub.
3. El código se subirá a **este mismo repositorio**, sin afectar otros repositorios.

Después del push, la carpeta incluye `README.md`, `docs/v4/`, `server.mjs`, `public/`, `tests/`, `deploy/` y `Abrir.command`.

## Seguridad

Nunca subir `.env`, claves API, seed phrases, datos de usuarios, ni la carpeta `~/Library/Application Support/PulpBeta`.

La aplicación local tiene operaciones con firma y conexión a proveedores en código, pero **no fue auditada ni comprobada contra fondos reales o una Mac física**. No abras el servidor local a Internet ni presentes una vista previa como servicio financiero en producción. Publicar el producto completo requiere HTTPS, PostgreSQL, proveedores, controles operativos y pruebas de extremo a extremo.

**Este repositorio y su demo visual no son un token, exchange ni plataforma financiera operativa en Mainnet.**
