// Fixed destinations preserve the existing Workers and their production sites.
// No browser cookies, credentials, or caller-supplied destination are forwarded.
const ROUTES = Object.freeze({
  '/api/email': ['GET', 'https://consultaedu-email-api.marcosdalleprane2.workers.dev/'],
  '/api/atividades': ['GET', 'https://consultaedu-gestores-api.marcosdalleprane2.workers.dev/'],
  '/api/devolucoes/catalog': ['GET', 'https://consultaedu-devolucoes-api.marcosdalleprane2.workers.dev/catalog'],
  '/api/devolucoes/upload': ['POST', 'https://consultaedu-devolucoes-api.marcosdalleprane2.workers.dev/upload'],
  '/api/suporte/criar': ['POST', 'https://consultaedu-api.marcosdalleprane2.workers.dev/suporte/criar'],
  '/api/suporte/status': ['GET', 'https://consultaedu-api.marcosdalleprane2.workers.dev/suporte/status'],
  '/api/dashboard': ['GET', 'https://consultaedu-dashboard-api.marcosdalleprane2.workers.dev/dashboard'],
  '/api/relatorios': ['GET', 'https://relatorio.consultaedu.com.br/api/']
});
const MAX_BODY = 22 * 1024 * 1024;
const jsonError = (status, message, extra = {}) => Response.json(
  {ok:false, sucesso:false, mensagem:message, erro:message},
  {status, headers:{'Cache-Control':'no-store', ...extra}}
);

export async function handleRequest(request, env, fetchUpstream = fetch) {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith('/api/') && incoming.pathname !== '/api') return env.ASSETS.fetch(request);
  const route = ROUTES[incoming.pathname.replace(/\/$/, '')];
  if (!route) return jsonError(404, 'Rota não encontrada.');
  const [method, destination] = route;
  const origin = request.headers.get('Origin');
  if (origin && origin !== incoming.origin) return jsonError(403, 'Origem não permitida.');
  if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:{Allow:method+', OPTIONS','Cache-Control':'no-store'}});
  if (request.method !== method) return jsonError(405, 'Método não permitido.', {Allow:method+', OPTIONS'});
  const target = new URL(destination);
  target.search = incoming.search;
  const headers = new Headers({Accept:'application/json'});
  let body;
  if (method === 'POST') {
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return jsonError(415, 'Envie conteúdo JSON.');
    if (Number(request.headers.get('Content-Length')) > MAX_BODY) return jsonError(413, 'O envio ultrapassa o limite permitido.');
    // Limit bytes actually received, including chunked requests.
    const reader = request.body?.getReader();
    const chunks=[]; let size=0;
    if (reader) while (true) {
      const {done,value}=await reader.read(); if(done) break;
      size += value.byteLength;
      if(size > MAX_BODY) {await reader.cancel(); return jsonError(413, 'O envio ultrapassa o limite permitido.');}
      chunks.push(value);
    }
    body=new Uint8Array(size); let offset=0;
    for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    headers.set('Content-Type', request.headers.get('Content-Type'));
  }
  try {
    // These are server-to-server requests. The existing Workers stay unchanged;
    // browser CORS is enforced at this same-origin gateway.
    const upstream = await fetchUpstream(target, {method, headers, body, redirect:'manual', signal:AbortSignal.timeout(60000), cache:'no-store'});
    if (upstream.status >= 300 && upstream.status < 400) return jsonError(502, 'Redirecionamento inesperado da API.');
    const responseHeaders = new Headers({
      'Content-Type':upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    });
    for(const name of ['Retry-After','X-Dashboard-Cache']) if(upstream.headers.has(name)) responseHeaders.set(name,upstream.headers.get(name));
    return new Response(upstream.body, {status:upstream.status, headers:responseHeaders});
  } catch {
    return jsonError(502, 'Não foi possível consultar a API. Tente novamente.');
  }
}
export default {fetch(request, env) { return handleRequest(request, env); }};
