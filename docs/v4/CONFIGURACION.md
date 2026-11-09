# Configuración de Pulp 4.0

Abrí primero `Configurar.command` para crear/editar `.env` privado. `Abrir.command` lo carga con Node; no ejecuta sus valores como código shell. Nunca pongas frases semilla o claves privadas. Para desarrollo: `node --env-file=.env server.mjs --open`.

## Variables y comportamiento

| Configuración | Uso real |
|---|---|
| `PULP_JUPITER_KEY` | Cotizaciones, precios y Earn; pertenece a tu cuenta de proveedor. También se puede guardar desde Ajustes. |
| `PULP_RPC_URL` | Endpoint HTTPS Mainnet, con cuotas y métodos adecuados. Devnet se configura en Ajustes. |
| `PULP_HISTORY_PROVIDER=rpc` | Recorrido paginado de la dirección raíz. Cobertura siempre parcial: no abarca necesariamente sus cuentas de tokens. |
| `PULP_HISTORY_PROVIDER=helius` | Usa `getTransactionsForAddress` con actividad de cuentas de tokens. El endpoint y el plan deben admitir el método. |
| `PULP_HISTORY_LIMIT` | Máximo de eventos retenidos por dirección; 5.000 por defecto, tope 50.000. Si se recorta, pierde elegibilidad de historial completo. |
| `PULP_DISCOVERY_ENABLED=1` | Busca candidatos públicos periódicamente. Consume cuota; no garantiza wallets elegibles ni rentables. |
| `PULP_MERCHANT_WALLET` | Dirección real que recibe los pagos USDC de suscripciones. Sin ella, no hay cobros. No poner una dirección ajena. |
| `PULP_SQUADS_MULTISIG` | Organización Squads v4 existente. El código no crea una organización ni añade miembros. |
| `PULP_PINATA_JWT` | Sube metadata JSON a Pinata/IPFS. Sin clave se exporta JSON, no se simula una subida. |
| `PULP_ENABLE_PROTOCOL_WRITES=1` | Permite preparadores **experimentales** de CPMM, LaunchLab, vesting y Squads. No es una certificación ni una prueba real. |
| `PULP_PAUSE_FINANCIAL=1` | Bloquea preparaciones y envíos financieros. Lectura e historial permanecen disponibles. |
| `PULP_LAUNCHLAB_CONFIG`, `PULP_LAUNCHLAB_PLATFORM` | Opciones avanzadas. Se leen y validan las cuentas on-chain; no reemplazar por direcciones inventadas. |
| `PULP_DATA_DIR` | Ubicación privada local. No usar la carpeta `public`. |

En modo local no completar `PULP_PUBLIC_ORIGIN`, Supabase ni admin si no se necesitan. La app funciona con JSON local y cuentas separadas por firma. En modo público las variables de origen, administrador, Supabase y cifrado son obligatorias; ver DESPLIEGUE.md.

## Recorrido inicial

Conectá una wallet de prueba compatible con Wallet Standard, verificá el mensaje de acceso y probá lectura. Guardá RPC/Jupiter en Ajustes. En Intelligence podés consultar una dirección, encolar páginas anteriores y ver cobertura. En Centro de operación, “Explorar actividad pública” encola descubrimiento; no introduce una lista ficticia. El servidor debe permanecer encendido para ejecutar las tareas.

Jupiter no ofrece mercados de prueba equivalentes a Mainnet. Devnet sirve para operaciones compatibles de prueba, no valida por sí sola un swap real. No uses una wallet con patrimonio significativo para evaluar esta beta.

## Qué no se provee

No se entregan claves de API, cuenta Supabase, dominio, bot Telegram, webhook Discord, fondos SOL/USDC, permisos Squads, mint PULP ni reservas de liquidez. No se necesita pagar a una wallet del desarrollador para activar Pulp.

## Mensajería

Cada cuenta guarda su propio bot/chat de Telegram o webhook de Discord cifrado. La cola envía solo notificaciones. Se prueba el formato y aislamiento, no la entrega a cuentas externas reales. Fallos pueden reintentarse; un proveedor que recibió un mensaje pero perdió la respuesta podría duplicar una notificación. No hay Web Push en segundo plano con el navegador cerrado.
