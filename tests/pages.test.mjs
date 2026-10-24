import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import worker, {handleRequest} from '../pages/_worker.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site='https://consultaedu-consolidado.pages.dev';
test('API routes preserve queries, upstream status, and response body without sharing cookies', async()=>{
  let captured;
  const response=await handleRequest(new Request(site+'/api/relatorios?semana=2026&t=1',{headers:{Cookie:'private=1',Authorization:'private',Origin:site,'Cf-Access-Jwt-Assertion':'header.payload.signature'}}),{},async(url,init)=>{
    captured={url:String(url),init};
    return new Response('{"ok":true,"dados":[]}',{status:200,headers:{'Content-Type':'application/json','Set-Cookie':'private=1','Access-Control-Allow-Origin':'https://old.invalid'}});
  });
  assert.equal(captured.url,'https://relatorio.consultaedu.com.br/api/?semana=2026&t=1');
  assert.equal(captured.init.headers.get('Origin'),null);
  assert.equal(captured.init.headers.get('Cookie'),'CF_Authorization=header.payload.signature');
  assert.equal(captured.init.headers.get('Authorization'),null);
  assert.equal(response.headers.get('Set-Cookie'),null);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(await response.json(),{ok:true,dados:[]});
});
test('support and uploads preserve JSON bytes and query parameters',async()=>{
  const body=JSON.stringify({nome:'Teste sintético',arquivos:[{base64:'AA=='}]});
  for(const [route,destination] of [['/api/suporte/criar','https://consultaedu-api.marcosdalleprane2.workers.dev/suporte/criar'],['/api/devolucoes/upload','https://consultaedu-devolucoes-api.marcosdalleprane2.workers.dev/upload']]){
    const response=await handleRequest(new Request(site+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:site},body}),{},async(url,init)=>{
      assert.equal(String(url),destination);assert.equal(init.method,'POST');assert.equal(new TextDecoder().decode(init.body),body);
      return new Response('{"sucesso":true}',{status:201,headers:{'Content-Type':'application/json'}});
    });
    assert.equal(response.status,201);
  }
});
test('gateway rejects unrelated origins, unknown routes, methods, oversized bodies and redirects',async()=>{
  let calls=0;
  const upstream=async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://evil.invalid'}});};
  for(const [request,status] of [
    [new Request(site+'/api/suporte/criar',{method:'POST',headers:{Origin:'https://other.invalid'}}),403],
    [new Request(site+'/api/arbitrary?url=https://evil.invalid'),404],
    [new Request(site+'/api/dashboard',{method:'POST'}),405],
    [new Request(site+'/api/suporte/criar',{method:'POST',body:'{}'}),415],
    [new Request(site+'/api/devolucoes/upload',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':String(23*1024*1024)},body:'{}'}),413]
  ]) assert.equal((await handleRequest(request,{},upstream)).status,status);
  assert.equal(calls,0);
  assert.equal((await handleRequest(new Request(site+'/api/dashboard'),{},upstream)).status,502);
});
test('all read routes keep their existing Workers and distinguish upstream failure',async()=>{
  for(const route of ['email','atividades','devolucoes/catalog','suporte/status','dashboard']){
    const response=await handleRequest(new Request(site+'/api/'+route),{},async()=>new Response('{"sucesso":false}',{status:503}));
    assert.equal(response.status,503);
  }
  assert.equal((await handleRequest(new Request(site+'/api/dashboard'),{},async()=>{throw Error('offline');})).status,502);
});
test('reports never call protected upstream without a session, and preserve rejection by Access',async()=>{
  let calls=0;
  const upstream=async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://consultaedu.cloudflareaccess.com/login'}});};
  assert.equal((await handleRequest(new Request(site+'/api/relatorios'),{},upstream)).status,401);
  assert.equal(calls,0);
  assert.equal((await handleRequest(new Request(site+'/api/relatorios',{headers:{'Cf-Access-Jwt-Assertion':'fake.fake.fake'}}),{},upstream)).status,401);
  assert.equal(calls,1);
});
test('Cloudflare execution context never replaces the fetch implementation for static requests',async()=>{
  const response=await worker.fetch(new Request(site+'/horarios/'),{ASSETS:{fetch:async()=>new Response('horarios')}},{waitUntil(){}});
  assert.equal(await response.text(),'horarios');
});
test('report pages and APIs reject deployment aliases and require Access on the approved hostname',async()=>{
  const env={ASSETS:{fetch:async()=>new Response('private shell')}};
  for(const hostname of ['59be6223.consultaedu-consolidado.pages.dev','preview.consultaedu-consolidado.pages.dev','unknown.example']){
    for(const pathname of ['/relatorios/','/relatorios/index.html','/api/relatorios']){
      assert.equal((await handleRequest(new Request('https://'+hostname+pathname,{headers:{'Cf-Access-Jwt-Assertion':'fake.fake.fake'}}),env)).status,404);
    }
  }
  assert.equal((await handleRequest(new Request(site+'/relatorios/'),env)).status,401);
  assert.equal(await (await handleRequest(new Request(site+'/relatorios/',{headers:{'Cf-Access-Jwt-Assertion':'test.session.token'}}),env)).text(),'private shell');
  const finalSite='https://consultaedu.grupofaveni.com.br';
  assert.equal((await handleRequest(new Request(finalSite+'/relatorios/'),env)).status,401);
  assert.equal(await (await handleRequest(new Request(finalSite+'/relatorios/',{headers:{'Cf-Access-Jwt-Assertion':'test.session.token'}}),env)).text(),'private shell');
});
test('build includes every area, resolves local assets and links, and excludes internal files',()=>{
  const publicRoot=path.join(root,'dist');
  const exists=relative=>fs.existsSync(path.join(publicRoot,relative));
  for(const area of ['','consulta-email','horarios','professores','atividades','atividades/devolucao','suporte','dashboard','relatorios']) assert.ok(exists(area+'/index.html'),area);
  for(const internal of ['CNAME','.git','relatorios/worker','relatorios/audit','relatorios/tests','relatorios/apps-script','jornada-cientifica','node_modules']) assert.equal(exists(internal),false,internal);
  const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
  for(const file of files(publicRoot).filter(f=>f.endsWith('.html') || f.endsWith('.css'))){
    const base='https://site.invalid/'+path.relative(publicRoot,file).replaceAll('\\','/');
    const content=fs.readFileSync(file,'utf8');
    const matches=file.endsWith('.html') ? [...content.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)] : [...content.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
    for(const [,value] of matches){
      if(/^(?:data:|#|mailto:|javascript:)/.test(value))continue;
      const resolved=new URL(value,base);
      if(resolved.origin!=='https://site.invalid')continue;
      let target=decodeURIComponent(resolved.pathname);
      if(target.endsWith('/'))target+='index.html';
      assert.ok(exists(target),`${path.relative(publicRoot,file)} -> ${value}`);
    }
  }
});
