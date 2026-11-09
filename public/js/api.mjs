let csrf = '';
export class RequestError extends Error {
    constructor(message, code, status) { super(message); this.code = code; this.status = status; }
}
export function setCsrf(value) { csrf = value; }
export async function api(route, params = {}, post = false) {
    const url = '/api/' + route + (post ? '' : Object.keys(params).length ? '?' + new URLSearchParams(params) : '');
    let response;
    try {
        response = await fetch(url, { method: post ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: post ? { 'Content-Type': 'application/json', 'X-Pulp-CSRF': csrf } : {}, body: post ? JSON.stringify(params) : undefined, signal: AbortSignal.timeout(90000) });
    }
    catch {
        throw new RequestError(post && route === 'tx/submit' ? 'No se recibió el resultado del envío. Revisá el historial antes de repetir.' : 'No se pudo contactar al servidor local. Comprobá que Abrir.command siga abierto.', 'CONNECTION', 0);
    }
    const result = await response.json().catch(() => ({ error: 'Respuesta inválida del servidor.' }));
    if (!response.ok)
        throw new RequestError(result.error || 'No se pudo completar la solicitud.', result.code, response.status);
    if (result.csrf)
        setCsrf(result.csrf);
    return result;
}
