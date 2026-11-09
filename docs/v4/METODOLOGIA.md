# Intelligence y estrategias: metodología realmente implementada

## Candidatos públicos, no direcciones inventadas

Descubrimiento consulta tokens con actividad de Jupiter y firmantes de transacciones que mencionan esos mints. Un firmante puede ser creador, bot, operador técnico o trader; no se atribuye su identidad a una persona famosa. Cada candidato conserva fuente y firmas. Solo los candidatos públicos entran al radar: indexar una wallet en tu lista no publica automáticamente esa lista.

No se entrega una lista de “ganadores” comprobada en vivo. Los datos se forman al configurar y ejecutar los proveedores. Los períodos/criterios se muestran; no aparecen direcciones sintéticas en la aplicación normal.

## Historial

El RPC estándar devuelve actividad de la dirección raíz y se etiqueta como parcial aunque se alcance el final del cursor. Helius puede incluir cuentas de tokens. Recorremos páginas, combinamos firmas únicas, registramos transacciones ausentes, gaps y truncación. Solo una ventana recorrida sin esos problemas puede considerarse completa para el cálculo. No representa todas las wallets ni posiciones de una persona.

## Costo y resultado

Se reconocen programas de swap admitidos y cambios netos de tokens. Solo se calcula FIFO para pares simples contra USDC con decimales verificables. Una transferencia entrante tiene costo desconocido; una salida consume inventario sin inventar una venta. Las ventas con parte de costo desconocido se identifican y no generan una recomendación. Se preserva dinero entero; el resultado es bruto en USDC, no rentabilidad neta en USD.

El modelo no reconstruye por completo SOL nativo/wSOL, perps, NFT, multisalto complejo, swaps token-token, LP, puentes o todos los programas nuevos. No calcula retorno ajustado por depósitos, drawdown consolidado, impuestos ni valor histórico USD exacto de toda la cartera. El gráfico antiguo de Portfolio sigue siendo valor observado, no un backtest completo. Los costos de red SOL se muestran aparte.

La puntuación solo se habilita con cobertura completa, al menos 30 días observados, 10 ventas con costo conocido, sin ventas parciales y sin orden intrabloque ambiguo. Su fórmula combina muestra, observación y proporción positiva; no prueba habilidad futura ni rentabilidad del seguidor. No hay garantía de ejecución al mismo precio que la wallet observada.

## Estrategias asistidas

Copy: observa compras simples contra USDC de una fuente. DCA: genera una intención cuando vence el intervalo. Umbral: genera una intención al observar la condición. Cada señal caduca, tiene presupuesto y requiere cotización/revisión/firma. No se ejecuta automáticamente. Las estrategias se limitan a Mainnet y presupuesto USDC; controles locales no equivalen a un mandato on-chain con límite inviolable.

No hay backtest prospectivo validado de seguidores, detección avanzada de sybils/wash trading, clustering de entidades, promesas de stop-loss ni ejecución mientras el servidor está apagado. Jupiter Trigger custodial no fue integrado como si fuera un producto autocustodiado.
