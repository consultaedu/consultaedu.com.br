const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');
if(path.dirname(output)!==root || path.basename(output)!=='dist') throw Error('Invalid output directory');
fs.rmSync(output,{recursive:true,force:true}); fs.mkdirSync(output);
const allowed=/\.(?:html|css|js|json|png|jpg|jpeg|webp|svg|ico|woff2?)$/i;
function copyFile(relative){
  const target=path.join(output,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(path.join(root,relative),target);
}
function copyDirectory(relative){
  for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
    const file=path.join(relative,entry.name);
    if(entry.isDirectory()) copyDirectory(file);
    else if(allowed.test(entry.name)) copyFile(file);
  }
}
for(const name of ['index.html','manutencao.html','style.css','script.js','favicon.png','grupo-faveni.png','preview.png','404.html']) copyFile(name);
for(const dir of ['consulta-email','horarios','professores','atividades','suporte','dashboard']) copyDirectory(dir);
for(const name of ['index.html','style.css','script.js','dashboard-core.js','config.js']) copyFile('relatorios/'+name);
copyDirectory('relatorios/assets');
for(const name of ['_worker.js','_routes.json','_headers']) fs.copyFileSync(path.join(root,'pages',name),path.join(output,name));
console.log('Cloudflare Pages: dist gerado com os arquivos públicos.');
