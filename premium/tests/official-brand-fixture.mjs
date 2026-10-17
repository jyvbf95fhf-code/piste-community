// Isolated visual fixture: current and parent presentation, without Auth/backend calls.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const baseline=execFileSync('git',['show','09cc7fd7bd24dbe1fcf1bc4a032771d569601955:premium/src/screens.mjs'],{encoding:'utf8'});
const fixture=`import {HomeScreen,AuthScreen,PlaceholderScreen} from '/src/screens.mjs';import {AppShell} from '/src/components.mjs';import {AuthScreen as PreviousAuthScreen} from '/src/__baseline-screens.mjs';const old=new URL(location.href).searchParams.has('baseline');document.querySelector('#app').innerHTML=location.pathname.startsWith('/auth')?(old?PreviousAuthScreen:AuthScreen)(location.pathname):AppShell(location.pathname==='/'?HomeScreen(undefined,undefined,undefined,true):PlaceholderScreen('/sessions'),location.pathname,'Sébastien','SL');if(old){document.querySelector('link[href="/src/official-brand.css"]').disabled=true;const logo=document.querySelector('.home-welcome-logo');if(logo)logo.style.backgroundImage='url(/src/assets/piste-home-wordmark.svg)';}`;
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');let body,type;
 if(url.pathname==='/src/__home_fixture.mjs'){body=fixture;type='text/javascript';}
 else if(url.pathname==='/src/__baseline-screens.mjs'){body=baseline;type='text/javascript';}
 else if(url.pathname.startsWith('/src/')){const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/src/'))throw Error('path');body=await readFile(file);type=file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.jpg')?'image/jpeg':'image/png';}
 else{body=(await readFile('index.html','utf8')).replace('/src/app.mjs','/src/__home_fixture.mjs');type='text/html';}
 res.writeHead(200,{'Content-Type':type});res.end(body);
}catch{res.writeHead(404).end();}}).listen(Number(process.env.PORT),'127.0.0.1');
