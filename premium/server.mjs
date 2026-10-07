import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png'};
http.createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const relative=pathname.startsWith('/src/')?pathname.slice(1):'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(path.join(root,'src')+path.sep) && file!==path.join(root,'index.html')){res.writeHead(403).end();return;}
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(body);
 } catch {res.writeHead(404).end('Introuvable');}
}).listen(Number(process.env.PORT || 4173),'0.0.0.0',()=>console.log('PISTE Premium : http://localhost:4173 (réseau local : port 4173)'));
