# API y mapa de fuentes

Todas las rutas permanecen bajo el mismo origen. GET consulta, POST muta. Los POST requieren Origin y X-Pulp-CSRF obtenido del bootstrap; las operaciones privadas requieren además cookie de sesión por firma. No enviar una private key a ningún endpoint.

`server/v4/module.mjs` exporta V4_GETS y V4_POSTS, lista autoritativa de las rutas. Los POST que preparan operaciones devuelven el mismo formato de plan del core (usuario, red, transacción, hash del mensaje, vencimiento, costos y resumen). `/api/tx/submit` exige una transacción firmada que coincida exactamente y un acuse de revisión; después se consulta `/api/tx/status`.

| Módulo | Archivos |
|---|---|
| Servidor, CSP, Host/Origin, CSRF, límites | server.mjs |
| Autenticación, swaps, envío, Earn, SPL y confirmación | server/service.mjs |
| Índice y FIFO | server/v4/history.mjs, analytics.mjs |
| Cuentas, alertas y estrategias | server/v4/module.mjs, jobs.mjs |
| Pago USDC | server/v4/commerce.mjs |
| CPMM y wSOL | server/v4/liquidity.mjs, wrap.mjs |
| LaunchLab y vesting | server/v4/launchlab.mjs |
| Squads | server/v4/governance.mjs, squads-transactions.mjs |
| Persistencia, cifrado | server/v4/storage.mjs, secrets.mjs |
| UI nueva | public/js/v4-ui.mjs, public/css/v4.css |

No es una API pública estable con SLA. No hay API key de Pulp para revender datos ni comandos que eludan firma. Los SDK/provider contracts pueden cambiar. El modo público debe operar una sola instancia hasta distribuir sesiones, cachés y planes de manera explícita.
