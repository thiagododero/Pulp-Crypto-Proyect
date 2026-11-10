> Documento heredado de White Edition 3.0. Para el estado actual usar `v4/ALCANCE_15_PUNTOS.md` y `v4/CONFIGURACION.md`.

# Matriz de implementación

| Capacidad | Código | Configuración / prueba real |
| --- | --- | --- |
| Cuenta con wallet | Wallet Standard + firma verificada | Requiere extensión compatible; probada con proveedor de prueba, no extensión real. |
| RPC | SOL, SPL, Token-2022, bloque, genesis, simulación, firmas | Endpoints públicos incluidos; disponibilidad y límites deben comprobarse. |
| Jupiter Swap v2 | Order → revisión → firma → Execute → RPC | API key del operador; no se ejecutó Mainnet en la construcción. |
| Envíos SOL/SPL | Construcción, firma, envío | Requiere saldo/fee; Token-2022 y wSOL directo no habilitados. |
| Jupiter Earn | Tokens/positions/deposit/withdraw + validador de intención | API beta, clave propia, rutas admitidas. Requiere validación real de depósito y retiro. |
| Crear token SPL | Emisión, ATA, supply, autoridad; metadata opcional | El usuario paga rent/fees y firma. No se desplegó el token PULP. |
| Descubrir proyectos | Perfiles y mercados DEX Screener | No constituye aprobación ni evaluación de rentabilidad. |
| Liquidez Raydium | Enlace oficial explícito | La operación se hace fuera de Pulp. |
| LaunchLab | Enlace oficial explícito | No se crearon curvas, preventas ni comisiones de plataforma. |
| PULP / Tesorería | Lectura del mint y wallet configurados | Hay que proporcionar direcciones auténticas de la red elegida. |
| Gobernanza | Consultas locales firmadas; enlace Realms/Squads | No mueve tesorería ni ejecuta decisiones on-chain. |
| Portfolio observado | Muestras autenticadas, locales, cada 15 minutos | Sin backfill; no PnL; precios incompletos marcados. |
| Actividad | Historial de operaciones enviadas desde Pulp | Exportación y actualización del estado; no historial completo del explorador. |
| UI kit / visuales | Integrados en la app | Recursos locales; fuentes del sistema; no archivos de fuentes. |

No se agregó una comisión secreta ni una cuenta receptora del desarrollador. La comisión propia de Pulp en Swap es 0% en esta beta. Las tarifas de terceros y los costos de red siguen aplicando.
