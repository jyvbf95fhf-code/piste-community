// Isolated visual fixture: render the existing components without Auth or backend calls.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const fixture=`import {HomeScreen,PlaceholderScreen} from '/src/screens.mjs';import {AppShell} from '/src/components.mjs';document.querySelector('#app').innerHTML=AppShell(location.pathname==='/'?HomeScreen(undefined,undefined,undefined,true):PlaceholderScreen('/sessions'),location.pathname,'Sébastien','SL');`;
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');let body,type;
 if(url.pathname==='/src/__home_fixture.mjs'){body=fixture;type='text/javascript';}
 else if(url.pathname.startsWith('/src/')){const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/src/'))throw Error('path');body=await readFile(file);type=file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.jpg')?'image/jpeg':'image/png';}
 else{body=(await readFile('index.html','utf8')).replace('/src/app.mjs','/src/__home_fixture.mjs');type='text/html';}
 res.writeHead(200,{'Content-Type':type});res.end(body);
}catch{res.writeHead(404).end();}}).listen(Number(process.env.PORT),'127.0.0.1');
