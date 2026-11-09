# Estado honesto de los 15 puntos

Versión 4.0.0-beta.1. Ampliación de integración, no certificación de producto al 100%. “Implementado” se refiere a código y pruebas controladas, no a servicios externos desplegados.

| Punto | Área | Implementado en el paquete | Pendiente, limitado o excluido |
|---|---|---|---|
| 1 | Estado y alcance | Mapa de capacidades y cuentas/proveedores visibles; carpeta de pruebas y reporte. | La evidencia es de código/fixtures. No equivale a revisión independiente o lanzamiento público. |
| 2 | Producto integrado | White Edition con módulos originales y 11 rutas nuevas enlazadas. | Persisten alcances parciales declarados en cada módulo. |
| 3 | Intelligence | Indexación paginada RPC/Helius, candidatos públicos, FIFO USDC, alertas, inbox y estrategias asistidas. | Sin lista de traders verificada en vivo, clustering avanzado, PnL universal ni copy automático. |
| 4 | Pulp Swap | Wallet Standard, Jupiter v2, revisión/firma/seguimiento; comisión configurable; señales DCA/umbral. | Integraciones externas por configurar/probar. DCA/límite son asistidos, no órdenes automáticas persistentes. |
| 5 | Trade & Earn | Jupiter Earn existente; lectura/crear/añadir/retirar Raydium CPMM SPL clásico; wSOL. | CPMM experimental bloqueado por defecto. Sin CLMM, vault propio, staking PULP ni todos los proveedores DeFi. |
| 6 | Launchpad | SPL genérico, metadata IPFS/exportación, plan distribución, LaunchLab V2 curva CP, compra/venta, vesting y publicación verificable. | LaunchLab experimental; sin marketplace auditado, campaña integrada ni distribución arbitraria ejecutada. Logo requiere URI pública. Solo configuraciones compatibles. |
| 7 | Portfolio | Saldos y precios, snapshots observados, historial indexado con ventas de costo conocido, posiciones específicas. | No hay rendimiento neto histórico consolidado para todos los activos/protocolos o wallets vinculadas. |
| 8 | Token oficial PULP | Plan económico y lectura de direcciones configurables; emisión oficial bloqueada. | No emitido, no pool oficial, no vesting oficial: excluido expresamente por el usuario. |
| 9 | Gobernanza y tesorería | Squads v4 existente: leer, descifrar transferencias SOL/USDC, proponer, votar y ejecutar con permisos/demora. Consultas comunitarias separadas. | Ruta experimental. No crea DAO ni implementa votación token-weighted/delegación universal; no ejecuta recompras automáticas. |
| 10 | Cuentas e infraestructura | Persistencia local o PostgreSQL/Supabase, sesiones por wallet, admin, cifrado, cola, proxy TLS y archivos Docker. | No desplegado ni probado contra nube real; una instancia, sin HA/autoscaling ni sincronización automática local→nube. |
| 11 | Diseño y UI Kit | White theme, biblioteca compartida, assets existentes, formularios, revisión, responsive, validaciones y estados. | Pruebas Chromium; no se acredita WCAG completa ni matriz real de Mac/Safari/iOS/wallets. |
| 12 | AI Studio y agente | Espacio de integración preservado, contrato técnico documentado; no acceso financiero por IA. | En construcción por acuerdo anterior. Falta integrar el estudio original y proveedores de IA. |
| 13 | Monetización y crecimiento | Pro/Team con pago único USDC verificable, cuotas, comprobantes, atribución de referidos, política de excedentes y comisiones configurables. | Sin campañas ejecutadas, avatar, soporte contratado, créditos IA, pagos automáticos a referidos ni conciliación general de todas las comisiones. |
| 14 | Verificación | Pruebas unitarias/HTTP/aislamiento y recorridos visuales/funcionales reproducibles, gate de protocolos y pausa. | No se ejecutaron transacciones reales, auditoría independiente, Docker/TLS real ni pruebas físicas de wallets/Mac. |
| 15 | Lanzamiento conjunto | Un único paquete, UI kit, fuentes, configuración, migración y despliegue. | No se habilita un lanzamiento financiero público hasta cerrar credenciales, infraestructura, pruebas reales y capacidades pendientes. |

No se fabrican wallets rentables, precios, rentabilidades, auditorías, contratos PULP ni estados de ejecución. Las ausencias se muestran, no se rellenan con datos de demostración. Los fixtures pertenecen únicamente a tests.
