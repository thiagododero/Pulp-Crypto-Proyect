# Verificación · Pulp White Edition 4.0

Entrega de código y pruebas controladas, **no validación financiera en vivo**.

## Evidencia reproducible

| Grupo | Resultado | Cobertura |
|---|---|---|
| Node | 106 pruebas aprobadas | Lógica, servidor, firma, precios/balances de prueba, aislamiento, pagos, protocolos binarios, pausa, cifrado, auto-puerto. |
| Navegador funcional original | 57 comprobaciones aprobadas | Wallet Standard efímera, swaps/envíos/SPL/Earn/historial con proveedores inyectados. |
| Navegador módulos 4.0 | 110 comprobaciones aprobadas | 11 rutas nuevas en 390/768/1440, sin overflow/undefined/error JS, alertas, inbox, DCA asistido, factura y detalle Squads. |
| White UI | 228 comprobaciones aprobadas | 14 rutas originales, seis anchos, temas, algunos pares de contraste, teclado, guía y recursos. |
| Sitio | 7 comprobaciones aprobadas | Cinco anchos, imágenes y destinos de enlaces. |
| Lanzadores Bash | 6 comprobaciones aprobadas | App, sitio y UI kit abren la URL esperada mediante un sustituto del navegador en Linux. |

Los conteos de interfaz son aserciones, no usuarios, transacciones reales o una auditoría de seguridad. No sumar todo como si fueran 514 flujos financieros independientes. Los resultados JSON y TAP están en `test-evidence/`.

## Protocolo nativo probado

Los tests construyen cuentas binarias independientes de prueba para CPMM, LaunchLab y Squads. Recorren preparación, revisión, firma Ed25519 efímera, envío a un RPC inyectado y confirmación inyectada. Incluyen redondeos de liquidez, límites de curva, vesting, contenido de pagos de tesorería, cambios de mensaje, firma de cuenta incorrecta y gates. Esto ayuda a detectar errores internos pero **no verifica el contrato actualmente desplegado ni ejecución real**.

## Navegador

Se usa un puente HTTP local desde Python hacia Node debido a restricciones del entorno. HTML/CSS/JS son los del paquete; la wallet y los proveedores son fixtures. Capturas rotuladas “ENTORNO DE PRUEBAS” no son métricas reales. No se incluyeron datos de prueba en la aplicación normal.

## Reproducir

Sin red ni instalación runtime:

```sh
npm test
npm run check
```

Para UI, herramientas de desarrollo necesarias: Python, Playwright/Chromium, cryptography, Pillow y TypeScript disponible para el empaquetador de test. No son dependencias del usuario de la app.

```sh
node tests/mock-server.mjs
# En otra terminal del desarrollador:
NODE_PATH=$(npm root -g) node tests/build-browser-harness.cjs
python tests/browser_bridge.py
python tests/v4-browser.py
python tests/white-browser.py
python tests/website-browser.py
python tests/launcher-shell.py
```

No usar `mock-server.mjs` como servicio real. El servidor normal es `server.mjs`.

## Sin validar

Extensiones reales y móvil wallet, Mainnet/Devnet real, macOS físico/Safari/iOS, despliegue Docker/TLS, PostgreSQL/Supabase real, disponibilidad y cuotas de proveedores, notificaciones Telegram/Discord externas, auditoría independiente, carga multiusuario y revisión completa WCAG. No se movieron fondos. Consultar `v4/ALCANCE_15_PUNTOS.md` antes de declarar el proyecto listo para público.
