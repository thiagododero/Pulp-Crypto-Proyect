# Pulp Crypto 4.2.1 · Publicación confirmada

**Publicado el 10 de noviembre de 2026 en el repositorio y la URL existentes.** No se necesita ejecutar el actualizador local ni activar Pages nuevamente.

- Aplicación: https://thiagododero.github.io/Pulp-Crypto-Proyect/?v=4.2.1#/home
- Repositorio: https://github.com/thiagododero/Pulp-Crypto-Proyect
- Commit de la aplicación: `2c4b4aab60f986423a43c9e3fa5c07d48394c1dc`.
- Workflow de publicación: https://github.com/thiagododero/Pulp-Crypto-Proyect/actions/runs/42895176298
- Resultado comprobado: `success`, incluido el paso de verificación por HTTPS de la URL, commit servido, imágenes, CSS y módulos JavaScript.

## Procedencia y comprobación

La publicación incorpora el paquete `Pulp_Crypto_4.2.1_Completo.zip`, SHA-256 `61858a14195a67a6d4a5ee214194161b2d2086c26fa5da0516ba6781bd9f10b6`.

Se verificaron los hashes de 200 archivos del manifiesto original, se incorporaron 56 archivos de código/documentación nuevos o modificados y se retiraron `public/js/studio.js` y `docs/v4/AI_STUDIO_CONTRATO.md`. Las ilustraciones y otros archivos sin cambios ya estaban en el repositorio y también fueron cotejados. La reconstrucción ejecutó 152 pruebas sin fallos. Pages volvió a ejecutar la suite antes de publicar.

La transferencia usó temporalmente bloques comprobados por checksum y un workflow auxiliar. Esos archivos fueron retirados del árbol final; solo permanecen en el historial de Git como evidencia del proceso. No se hizo force push ni se reescribió el historial.

## Alcance publicado

Pulp queda dedicado al proyecto cripto, sin AI Studio ni funcionalidades creativas. Conserva Radar, perfiles, Swap, Earn, Liquidez, Launchpad, Portfolio, Actividad y herramientas de cuenta/administración, con el sistema de diseño White.

`public/` es la fuente única de la interfaz; `scripts/build-pages.mjs` genera `_site/`. La presentación publicada no puede conectar wallets, solicitar firmas ni ejecutar pagos. No se lanzó PULP ni se movieron fondos. El backend permanece en el repositorio, pero GitHub Pages no lo ejecuta.

## Manifiestos y desarrollo posterior

`UPDATE_MANIFEST.json` y `MANIFEST.json` son registros de integridad del ZIP original. Este documento, README y la guía de inicio se actualizaron después del envío para reflejar la publicación, por lo que pueden diferir de esos registros originales. La integridad del código publicado queda fijada por el commit de la aplicación indicado arriba.

`Publicar_en_GitHub.command` se conserva como herramienta del paquete original, no como requisito de uso. Su protección contra cambios en la rama impide repetir una actualización antigua sobre el repositorio ya actualizado. Para futuras modificaciones, trabajá con un clone de `main` y el workflow de Pages existente.

Los reportes de QA anteriores describen pruebas en Chromium offline. La publicación incorpora comprobaciones HTTP reales, no una auditoría financiera ni una prueba en un iPhone físico.
