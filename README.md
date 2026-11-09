# 🐙 Pulp Crypto — White Edition 4.0

**Repositorio de la beta de integración de Pulp Web3** con diseño blanco/violeta, sistema de componentes y recursos de la mascota Pulp.

**Código fuente sincronizado:** 169 archivos del paquete Pulp 4.0, además del README, una vista previa estática y GitHub Actions. Se excluyeron únicamente las capturas de pruebas y evidencias generadas para mantener el repositorio liviano. No se incluyeron credenciales privadas.

## Qué incluye

- **Intelligence:** consultas on-chain, histórico, watchlists, descubrimiento de wallets y alertas.
- **Pulp Swap:** integración con Jupiter en código, revisión, firma y seguimiento de transacciones.
- **Trade & Earn:** mercados, posiciones y preparación de operaciones DeFi.
- **Launchpad:** SPL, metadata y preparadores de LaunchLab y Raydium (experimentales/bloqueados por defecto).
- **Portfolio, token y tesorería:** saldos y consultas verificables cuando se configuran proveedores.
- **Gobernanza:** votación local y preparadores de operaciones de una Squads existente.
- **White Edition:** UI kit, tema claro y oscuro, iconos y recursos visuales de Pulp.
- **AI Studio:** pantalla en construcción para integrar después el código original.

Este repositorio **no despliega el token PULP**. Los servicios y contratos que aún no existan no se reemplazan por datos ficticios.

## Abrir la app desde GitHub en Mac

Necesitás Node.js 20.11 o superior y una wallet compatible para probar la integración.

```bash
git clone https://github.com/thiagododero/Pulp-Crypto-Proyect.git
cd Pulp-Crypto-Proyect
node server.mjs --open
```

También podés usar `Abrir.command` desde Finder. El lanzador busca un puerto libre; no requiere `npm install`. No ejecutes dos versiones diferentes usando el mismo directorio de datos.

## Ver la vista previa en el navegador

La vista previa **solo muestra diseño**, sin datos de inversión, wallets conectadas ni operaciones:

- Archivo: [docs/index.html](docs/index.html)
- Para publicar una URL, abrí **Settings → Pages → Build and deployment → GitHub Actions**. Después reejecutá el workflow **Publicar vista previa de Pulp** en la pestaña Actions.
- La primera ejecución de Pages falló porque GitHub Pages todavía no estaba habilitado. Es posible que GitHub requiera cambios de visibilidad o plan según las condiciones del repositorio privado.

**GitHub Pages no ejecuta el backend Node ni habilita swaps.** La app financiera completa requiere despliegue separado con HTTPS, base de datos, RPCs, credenciales y comprobaciones de seguridad.

## Configuración segura

La plantilla [`.env.example`](.env.example) contiene **campos vacíos**, no credenciales. Las claves reales se guardan fuera de Git, nunca en commits.

Para configurar proveedores (RPC, Jupiter, Helius, Pinata, Squads y Supabase), leer:
- [Guía de inicio](LEEME_PRIMERO.md)
- [Configuración](docs/v4/CONFIGURACION.md)
- [Despliegue](docs/v4/DESPLIEGUE.md)
- [Alcance de los 15 puntos](docs/v4/ALCANCE_15_PUNTOS.md)
- [Seguridad](docs/v4/OPERACION_Y_SEGURIDAD.md)

## Pruebas

```bash
npm run check
npm test
```

También se ejecutan automáticamente en GitHub Actions (`Tests Pulp 4.0`).

## Advertencia técnica

**Beta de integración, no producción auditada.** Las rutas financieras fueron probadas con proveedores y wallets de prueba, no con operaciones reales ni una Mac física. No exponer el servidor local con túneles ni habilitar preparadores experimentales sin verificar protocolos y autorizaciones. No publicar ninguna seed phrase, clave privada, `.env`, backup o datos de usuarios.

