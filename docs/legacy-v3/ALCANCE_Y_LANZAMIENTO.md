> Documento heredado de White Edition 3.0. Para el estado actual usar `v4/ALCANCE_15_PUNTOS.md` y `v4/CONFIGURACION.md`.

# Alcance real y requisitos para una beta pública

## Entregado en 3.0

White-first en todas las rutas, sistema de componentes consolidado, seis nuevos recursos con transparencia, biblioteca, UI kit, sitio de presentación y apertura local para Mac. Integraciones preservadas de la beta: Wallet Standard, autenticación por firma, consulta RPC, swaps, transferencias, Jupiter Earn y emisión de tokens SPL con revisión explícita.

Se agregan primeros pasos, guía, estado de integraciones, actividad separada, diagnóstico sin secretos, muestras de valor observado del portfolio y distribución de activos con precio. Configuración y datos anteriores usan el mismo directorio privado.

## No entregar como completado

| Capacidad | Estado real |
|---|---|
| Swap, transferencias, Earn, emisión SPL | Código integrado; pruebas con wallets/proveedores de prueba. Necesita configuración y validación real. |
| Pools / curvas de lanzamiento | Enlaces externos identificados a Raydium. No operaciones nativas dentro de Pulp. |
| Token oficial, supply/distribución final y liquidez | No emitidos ni financiados en esta entrega. No se utilizaron claves del fundador. |
| PULP vesting, recompras automáticas, vaults propios | No implementados. Requieren especificación económica y revisión de contratos. |
| Copy trading automático | No habilitado. Intelligence es observación de datos públicos. |
| Gobernanza | Consultas locales firmadas y no vinculantes. No ejecución DAO. |
| Sitio público / multiusuario | No desplegado. El backend actual es local y de un operador. |
| Auditoría independiente | No realizada. |

## Orden de cierre previo a un único lanzamiento público

1. Operador: configurar RPC/API propios y confirmar dominios/contratos auténticos. Mantener secretos fuera del frontend.
2. Validación: extensiones reales, Mac/Safari y dispositivos móviles; rechazos, cambios de cuenta, expiraciones y cortes de red. Devnet primero para emisión/envíos; luego importes pequeños autorizados para las rutas Mainnet que correspondan.
3. Seguridad: revisión independiente del constructor/inspector de transacciones, autorizaciones, rutas de proveedores, almacenamiento y recuperación. No ampliar instrucciones admitidas simplemente para evitar errores.
4. Infraestructura pública: backend multiusuario separado, autenticación administrativa, roles, sesiones HTTPS, base de datos, backups, límites por usuario, monitoreo y una política de incidentes. No exponer `server.mjs` actual con túneles ni `0.0.0.0`.
5. Token: fijar supply, distribución, vesting, facultades de emisión, tesorería, liquidez y límites de gasto. Crear y publicar direcciones bajo las firmas del propietario.
6. Negocio: habilitar tarifas solo tras configurar receptores y mostrar costos exactos; separar ingresos, reservas y liquidez. No repartir ingresos comprometidos en servicios pendientes como beneficio.
7. Lanzamiento: revisar todos los flujos en el dominio real, documentación de riesgos/proveedores y rutas para retirar sin depender de Pulp.

Estas son dependencias reales, no botones que se deban mostrar como “listos”. El paquete no se anuncia como 100% operativo públicamente.
