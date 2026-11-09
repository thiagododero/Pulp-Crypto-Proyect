# Pulp 4.0 · White Edition · Beta de integración

**Entrega: 9 de noviembre de 2026 · 4.0.0-beta.1.** Ampliación real del código de White Edition, no una maqueta nueva. Conserva el diseño blanco, violetas y pulpos. No emite el token oficial PULP.

## Abrir en Mac

Cerrá la versión anterior con Ctrl+C. Descomprimí toda la carpeta `Pulp_4_White`, usá Node 20.11 o superior y hacé doble clic en **Abrir.command**. No necesita npm install. El puerto se elige automáticamente; no mates procesos de otras aplicaciones. Dejá la Terminal abierta mientras usás Pulp.

**Abrir-UI-Kit.command** abre el sistema de diseño. **Abrir-Web.command** abre la presentación. **Configurar.command** crea/edita `.env` privado. **Probar.command** ejecuta pruebas sin red. Con macOS bloqueando un archivo de procedencia conocida: clic derecho → Abrir, o `bash ` + arrastrar el `.command` a Terminal; no desactivar protecciones globales.

## Datos de la versión anterior

Se usa `~/Library/Application Support/PulpBeta` (Linux `~/.pulp-beta`). No publicar esa carpeta. La configuración antigua se respalda en `backup-pre-v4` y se migra a cifrado; el respaldo antiguo contiene secretos en texto plano y debe permanecer privado. No ejecutar v3 y v4 simultáneamente ni intentar volver a v3 sobre la configuración cifrada. Consultar OPERACION_Y_SEGURIDAD para backup/rollback.

## Lo nuevo

Intelligence con histórico paginado y cobertura explícita; descubrimiento de candidatos on-chain; análisis FIFO de pares simples USDC; alertas de wallets/precio; inbox y canales Telegram/Discord configurables; estrategias copy/DCA/umbral **asistidas**; pagos únicos USDC Pro/Team; cifrado de secretos y sesiones revocables; contabilidad de cobros/egresos declarados; almacenamiento PostgreSQL/Supabase opcional.

Además se incluyen preparadores **experimentales** nativos para Raydium CPMM, LaunchLab V2 con compra/venta de curva y vesting, y propuestas/votos/transferencias de una Squads existente. Están bloqueados por defecto, no auditados y no validados con fondos reales. No habilitarlos por el solo hecho de ver una pantalla o tests aprobados.

## Conectar datos reales

En Ajustes, configurar RPC/Jupiter. En Configurar.command, añadir opcionalmente Helius, Pinata, comercio USDC y Squads según docs/v4/CONFIGURACION.md. Sin credenciales/cuentas válidas los servicios muestran error o ausencia; no se sustituyen por fixtures. Intelligence no trae “ballenas ganadoras” inventadas: el radar se puebla al descubrir/indexar actividad. El operador puede usar “Explorar actividad pública” o activar el worker en `.env`.

Nunca ingreses una seed phrase. Conectar la wallet y firmar acceso no habilita gasto; cada operación requiere revisión y firma independiente. Los mecanismos asistidos no ejecutan por vos cuando te desconectás.

## Alcance exacto

Abrí **ESTADO_DEL_ALCANCE.html**, o `docs/v4/ALCANCE_15_PUNTOS.md`. La entrega no equivale a completar el 100% del plan original: incluye extensiones implementadas, rutas experimentales, requisitos externos y capacidades aún ausentes. AI Studio permanece en construcción según lo acordado; no se recibió su fuente.

No se desplegó nube, token PULP, pool oficial, DAO propia ni cuentas de proveedores. No hay copy trading desatendido, vault propio, PnL universal, recompras automáticas o programa de referidos con pagos. La DAO integrada es Squads existente, no gobernanza token-weighted completa. No se anuncia auditoría, rentabilidad ni regreso garantizado.

## Uso público

El lanzador abre local en 127.0.0.1. **No exponer directamente el modo local por un túnel.** Existe un modo público explícito con HTTPS, admin wallet, Supabase y clave de cifrado obligatorios. Se entregan migración SQL, Dockerfile y proxy Caddy: no fueron desplegados ni probados contra servicios reales. Una instancia solamente. Ver docs/v4/DESPLIEGUE.md.

## Pruebas

`npm test` y `npm run check` no descargan paquetes. Los recorridos UI son opcionales para desarrolladores y requieren Python/Playwright/Chromium/cryptography y TypeScript para el harness. Ver docs/PRUEBAS.md y reportes JSON/TAP. Tests con proveedores/keys efímeras, no una extensión real ni dinero real. No probada en Mac físico/Safari/iOS.

## Documentación

- `docs/v4/CONFIGURACION.md`: variables, proveedores y primer uso.
- `docs/v4/ALCANCE_15_PUNTOS.md`: trabajo cubierto y faltantes.
- `docs/v4/METODOLOGIA.md`: cobertura, costos desconocidos y reglas del radar.
- `docs/v4/OPERACION_Y_SEGURIDAD.md`: pausa, firmas, respaldos y riesgos.
- `docs/v4/DESPLIEGUE.md`: PostgreSQL, TLS y operación de instancia única.
- `docs/v4/API.md`: mapa del código y contratos de rutas.
- `docs/DESIGN_SYSTEM.md`: fundamentos visuales compartidos.
- `docs/v4/FUENTES.md`: documentación primaria consultada.

No inviertas fondos importantes ni abras servicios financieros al público sin validar cada conexión/ruta y hacer una revisión independiente.
