> Documento heredado de White Edition 3.0. Para el estado actual usar `v4/ALCANCE_15_PUNTOS.md` y `v4/CONFIGURACION.md`.

# Seguridad — alcance y pendientes

La aplicación **no fue auditada**. Las pruebas incluidas no prueban seguridad de los protocolos ni reemplazan revisión independiente.

## Controles implementados

- Conexión mediante Wallet Standard; nunca frase semilla, clave privada de usuario o permiso de firma persistente.
- Nonce, dominio y vencimiento para acceso; firma Ed25519 verificada en Node.
- Host de loopback y origen exacto; CSRF; archivos privados fuera del servidor estático; CSP y anti-framing.
- RPC HTTPS con verificación de red y rechazo de destinos locales conocidos. El control DNS no debe considerarse una defensa completa contra un operador de DNS malicioso; el operador local debe configurar endpoints de confianza.
- Cantidades financieras con BigInt y reglas estrictas de decimales. La valoración USD informativa usa números y no determina cantidades enviadas.
- Comparación del mensaje firmado byte por byte; preservación de firmas parciales de otros participantes.
- Cotizaciones caducables, confirmación explícita sin casilla premarcada, idempotencia y diario previo al envío.
- Simulación sin cambiar el blockhash, comprobación de su validez y costo de red.
- Validación de intención Earn con programas, cantidades, receptor, activo e instrucciones conocidas. Variantes desconocidas se bloquean.
- Tokens sin precio no se presentan como de valor cero; PULP sin mint no tiene un gráfico inventado.

## Confianza restante

Se confía en la wallet del usuario, el RPC, Jupiter, sus rutas y los contratos de protocolo. Un hash correcto no demuestra que una instrucción sea segura. Un swap no tiene un decodificador semántico universal de todos los routers: compara la intención del pedido y la respuesta, muestra programas y depende además de simulación y revisión de la wallet. No se autoriza una ruta automáticamente.

La implementación ligera de formato Solana/PDA reduce dependencias de instalación, pero requiere contraste adicional con SDKs de referencia y operaciones Devnet. No está certificada. No habilites la beta con fondos importantes solo porque pasan las pruebas locales.

La creación de mint usa una clave nueva efímera exclusivamente para crear ese mint; no es una wallet de fondos de usuario. La clave no se escribe en disco. La operación lleva también la firma de la wallet del propietario.

Las firmas ya enviadas no pueden cancelarse desde un botón local. Si el envío fue ambiguo, no se vuelve a emitir de manera automática. Consultá firma y request ID. La protección idempotente corresponde a la misma intención; crear voluntariamente otro plan puede ocasionar otra operación.

## No soportado en esta beta

Publicación segura multiusuario, firma automática, hardware wallets no probadas, multisig como wallet de acceso, transferencias Token-2022 con extensiones, acciones sobre cualquier contrato, administración LP dentro de Pulp, on-chain DAO y vigilancia persistente de copy trading.

## Prueba humana previa a fondos reales

1. Revisar código, endpoints y parámetros del protocolo con una persona competente independiente.
2. Comprobar extensión real y firma de acceso, rechazar una firma y cambiar de cuenta/red.
3. En Devnet, crear un token de prueba y transferir importes mínimos sin valor; contrastar suministro, metadata y autoridades en el explorador.
4. Con proveedores configurados, verificar cotizaciones reales y simular sin firmar. Comparar importes con la app oficial.
5. Solo después de revisión, probar Mainnet con una wallet dedicada y un monto que se pueda perder; contrastar firmas, costos, balances y retiros en el explorador.
6. No publicar una beta abierta hasta probar repetición, timeout, almacenamiento, reinicios, límites y recuperación.

No enviar claves de usuario a soporte ni incluir la carpeta de datos en un ZIP público.
