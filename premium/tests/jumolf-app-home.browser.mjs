// Real shared shell and production styles; no account services or writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import bundle from '@sparticuz/chromium';
import {JumolfShell} from '../src/jumolf-shell.mjs';
import {AppShell} from '../src/components.mjs';
import {HomeScreen} from '../src/screens.mjs';
import {mock} from '../src/data.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname),template=(await readFile(path.join(root,'index.html'),'utf8')).replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
const server=createServer(async(req,res)=>{try{const route=new URL(req.url,'http://localhost').pathname;if(route==='/'||route.startsWith('/jumolf')){const content=route==='/'?HomeScreen(mock.user,[],undefined,false):JumolfShell(route,'<section class="jumolf-panel"><h1>Écran JUMOLF</h1>'+Array.from({length:45},(_,i)=>'<p>Observation terrain '+i+'</p>').join('')+'</section>',{realMode:true,dogId:'dog-a'});res.setHeader('Content-Type','text/html');res.end(template.replace('<div id="app"></div>',AppShell(content,route,'Camille','C','base',0,{realMode:true})));return;}const file=path.join(root,route);res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webp')?'image/webp':file.endsWith('.jpg')?'image/jpeg':'image/png');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await bundle.executablePath(),args:bundle.args,headless:true});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',route=>route.abort());const origin='http://127.0.0.1:'+server.address().port;let checks=0;
for(const width of [320,390,430,1280])for(const route of ['/jumolf','/jumolf/prepare','/jumolf/train','/jumolf/analyze','/jumolf/progress','/jumolf/settings','/jumolf/rex']){
 await page.setViewportSize({width,height:844});await page.goto(origin+route);await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 const home=page.getByRole('link',{name:'Accueil PISTE Community',exact:true});assert.equal(await home.getAttribute('href'),'/');assert.equal(await page.locator('.v3-nav a').count(),5);assert.match(await page.locator('.v3-nav a').first().getAttribute('href'),/^\/jumolf\?dog=dog-a/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(width<=760){const box=await home.boundingBox(),nav=await page.locator('.v3-nav').boundingBox();assert.ok(box.height>=44&&box.width>=44);assert.ok(box.y>=0&&box.y+box.height<=nav.y,'app home remains visible above internal navigation');assert.equal(await home.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true);}
 if(width===390&&route==='/jumolf/analyze')await page.screenshot({path:'/tmp/jumolf-app-home-390.png',fullPage:false});
 await home.click();await page.getByRole('heading',{name:'Prêts pour le terrain ?',exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/');checks++;
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',checks,widths:[320,390,430,1280],routes:7,appHome:'/',internalTabs:5,pageErrors:0}));
}finally{await browser.close();server.close();}
