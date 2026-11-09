# Operación, seguridad y recuperación

## Controles implementados

Wallet Standard; nonce, dominio y vencimiento del acceso; verificación Ed25519; cookies HttpOnly/SameSite y Secure en modo público; CSRF y comprobación de origen/Host; CSP; permisos de operador; aislamiento de perfiles; revocación de sesiones. No hay seed phrase ni custodia de la wallet del usuario.

Una operación se prepara, valida, simula y presenta antes de firmar. El mensaje firmado debe coincidir con el revisado; usuario, red, versión de configuración, importe y caducidad permanecen vinculados. Los importes de ejecución usan enteros. Hay reservas de SOL, mínimos recibidos, verificación del genesis hash y rechazo de variantes desconocidas. La simulación no demuestra que un contrato sea seguro.

Las escrituras nuevas de protocolos están bloqueadas por defecto. Activarlas no elimina la revisión pendiente. Los contratos externos pueden actualizarse; comparar direcciones, IDL/código y facultades administrativas antes de validar la integración.

## Pausa e incertidumbre

Configurar `PULP_PAUSE_FINANCIAL=1` y reiniciar detiene nuevas preparaciones/envíos. No cancela instrucciones ya firmadas/enviadas, no cierra posiciones, no retira liquidez y no devuelve pagos. Una respuesta perdida puede corresponder a una operación ejecutada: revisar firma, explorador y proveedor antes de repetir. No reenviar una creación de token o una transferencia solo por timeout.

La implementación no firma en nombre del usuario. Las estrategias generan sugerencias, no ejecuciones desatendidas. No hay martingala, apalancamiento propio ni claves almacenadas para copiar trades.

## Secretos y respaldos

Configuración y canales se cifran con AES-256-GCM. Localmente la clave maestra está en `v4-master.key` con permisos 600; quien controle el usuario/disco puede leerla. El cifrado no protege ante un host comprometido. Perfiles, mensajes y registros de transacciones no se cifran individualmente. En nube usar almacenamiento privado, cifrado de disco, secretos fuera del repositorio y acceso administrativo limitado.

Al migrar una configuración local v3 en texto plano, se crea `backup-pre-v4` restringido antes de cifrarla. Ese respaldo contiene los secretos antiguos sin cifrar. Conservarlo privado para rollback y eliminarlo solo después de validar/restaurar una copia segura. No distribuir el directorio de datos.

Con la app detenida, `node scripts/backup.mjs` respalda JSON y clave local en `~/Pulp-Backups/...`. El `.env` se respalda por separado y protegido. Para Supabase se requiere backup de PostgreSQL más la clave de cifrado del entorno; el script local no exporta el servicio remoto. Restaurar con el proceso detenido y una copia previa; verificar lectura antes de volver a operar.

## Alcance de auditoría

Registro con hashes encadenados en BD/local. No es un registro inmutable anclado a blockchain: un administrador con control completo puede reescribirlo. Se conservan comprobantes de pagos y operaciones al borrar preferencias para conciliación; la blockchain es pública. Exportar una cuenta no exporta claves ni todos los datos del operador.

## Capacidad y servicios

Cola persistente con leases/reintentos e idempotencia por tarea; hasta 2.000 entradas activas, ventanas acotadas de eventos y candidatos. Procesamiento en una instancia; no es un indexador de toda Solana. Las cuotas de proveedores, retrasos y costos se deben monitorear. No hay SLA contractual, auditoría externa ni garantía de rendimiento.
