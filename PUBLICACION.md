# Publicación de Pulp Crypto 4.2.1

Repositorio único: `thiagododero/Pulp-Crypto-Proyect` · rama `main`.
URL prevista después de publicar: https://thiagododero.github.io/Pulp-Crypto-Proyect/

**Esta revisión no fue subida ni publicada desde ChatGPT.** El código local está preparado y probado. La cuenta GitHub conectada aquí solo expone acciones de lectura; no se usaron tokens privados ni credenciales de usuario.

## Enviar la actualización

Con Git autenticado y Node.js 20.11 o superior en tu Mac, abrí `Publicar_en_GitHub.command`. El script clona el mismo repositorio, valida la revisión base, comprueba los archivos y las eliminaciones, ejecuta las pruebas y te pide escribir `PUBLICAR` antes del commit/push. Nunca hace force push. Si el repositorio cambió desde la revisión base, se detiene para no pisar trabajo nuevo.

Cuando el push termine, GitHub Actions ejecutará `Publicar Pulp · interfaz unificada`. No alcanza con que Git acepte el commit: la publicación está confirmada cuando el workflow de Pages termine correctamente.

## Qué cambia

Incluye todo el rediseño White 4.2 y retira el módulo creativo de navegación, vistas, script, estilos, landing, capacidades y documentación de integración. El planificador de lanzamientos y la biblioteca técnica del UI kit permanecen dentro del producto cripto.

`public/` sigue siendo la única interfaz. `scripts/build-pages.mjs` genera la presentación de Pages; el controlador de wallet de esa presentación no puede conectar ni firmar. No se lanza el token PULP ni se habilitan operaciones financieras.

Los archivos a retirar se enumeran con hashes en `UPDATE_MANIFEST.json`. No hace falta borrarlos manualmente.
