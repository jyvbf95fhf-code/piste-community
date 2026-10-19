// Local-only integration: bundled SDK and complete app; synthetic Auth, no live e-mails.
import {chromium} from '@playwright/test';import chromiumBundle from '@sparticuz/chromium';
import {createRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await chromiumBundle.executablePath(),args:chromiumBundle.args,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],calls=[];
 let enabled=true; const sessionId='33333333-3333-4333-8333-333333333333'; let projection;
 const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{role:'admin'}};
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');
 const gps={provenance:'device-geolocation',phase:'finished',startedAt:100000,endedAt:160000,elapsedMs:60000,distanceM:125,segments:[[{latitude:48.2,longitude:7.3,accuracy:5},{latitude:48.201,longitude:7.301,accuracy:5}],[{latitude:48.21,longitude:7.31,accuracy:5}]]};
 projection={id:sessionId,version:5,phase:'ARCHIVED',role:'driver',mode:'full_blind',dog:'Nox',traceType:'direct',pose:gps,search:gps,searchActiveMs:45000,team:[{id:user.id,name:'Compte réel',role:'driver'}],notes:[{authorName:'Coach',text:'Session vérifiée'}],events:[{text:'Recherche terminée',at:160000,source:'driver'}]};
 const headers={'access-control-allow-origin':'https://piste.test','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,OPTIONS'};
 page.setDefaultTimeout(12000);page.on('pageerror',e=>{errors.push(e.message);console.error('APP ERROR:',e.stack);});
 await page.route('https://piste.test/**',async route=>{const path=new URL(route.request().url()).pathname;const source=path.endsWith('.mjs')||path.endsWith('.css')||path.endsWith('.js')||path.includes('/assets/')||path.endsWith('.html')?path:'/index.html';try{const body=await readFile(new URL('..'+source,import.meta.url));await route.fulfill({body,contentType:source.endsWith('.mjs')||source.endsWith('.js')?'text/javascript':source.endsWith('.css')?'text/css':source.endsWith('.html')?'text/html':source.endsWith('.svg')?'image/svg+xml':'image/png'});}catch{await route.fulfill({status:404,body:''});}});
 await page.route('https://shnwqdkiapgcftbnhilh.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;calls.push([req.method(),path]);
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
  let json=user,status=200;
  if(path==='/auth/v1/token')json={access_token:token,refresh_token:'synthetic',expires_in:3600,token_type:'bearer',user};
  if(path==='/auth/v1/signup')json={...user,id:'22222222-2222-4222-8222-222222222222',identities:[]};
  if(path==='/auth/v1/recover'){status=429;json={code:'over_email_send_rate_limit',msg:'email rate limit exceeded'};}
  if(path==='/functions/v1/coaching'){const data=req.postDataJSON();assert.ok(['profile','list','invitations','notifications','read','coaching-inbox'].includes(data.operation),'unexpected operation '+data.operation);if(!enabled){status=403;json={error:'Compte non autorisé pour ce pilote.'};}else json=data.operation==='coaching-inbox'?{invitations:[],notifications:[]}:data.operation==='profile'?{id:user.id,name:'Compte réel',qa:false}:data.operation==='list'?{sessions:[projection]}:{projection};}
  await route.fulfill({status,headers,json});
 });

 await page.goto('https://piste.test/auth/login');
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByText('Prêts pour le terrain ?').waitFor();
 await page.goto('https://piste.test/tracks');
 await page.locator('[data-history-session="'+sessionId+'"]').waitFor();
 assert.equal(await page.locator('[data-history-session^="demo:"]').count(),0);
 assert.equal(await page.getByRole('link',{name:'Ouvrir le créateur de tracé',exact:true}).count(),0);
 await page.getByLabel('Statut',{exact:true}).selectOption('Archivées');
 await page.getByRole('button',{name:'Appliquer les filtres',exact:true}).click();
 await page.waitForURL('**/tracks?**status=Archiv%C3%A9es**');
 await page.getByRole('link',{name:'Ouvrir le dossier',exact:true}).click();
 await page.locator('[data-session-dossier="'+sessionId+'"]').waitFor();
 for(const label of ['Carte','Statistiques','Chronologie','Débrief','Replay','Rapport PDF']){
  await page.locator('.dossier-tabs').getByRole('link',{name:label,exact:true}).click();
  await page.locator('[data-dossier-panel]').waitFor();
  assert.equal(await page.locator('[data-remote-form], [data-gps-live], [data-debrief="archive"]').count(),0);
 }
 await page.getByRole('button',{name:'Imprimer / enregistrer en PDF',exact:true}).waitFor();
 assert.ok((await page.locator('.dossier-report').innerText()).includes('Session vérifiée'));
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);}
 await page.screenshot({path:'/tmp/mes-pistes-report.png',fullPage:true});
 await page.pdf({path:'/tmp/mes-pistes-report.pdf',format:'A4',printBackground:true});
 await page.goto('https://piste.test/tracks?category=training');
 await page.getByText('Aucune source de séances d’entraînement n’est actuellement raccordée en V2. Les sessions Coaching restent dans Pistes opérationnelles.').waitFor();
 // Active sessions keep their canonical cockpit and cannot gain dossier geometry.
 projection={...projection,phase:'SEARCH_RUNNING',pose:null,search:null};
 await page.goto('https://piste.test/tracks');await page.getByRole('link',{name:'Ouvrir le cockpit',exact:true}).waitFor();
 await page.goto('https://piste.test/sessions/'+sessionId+'?tab=report');await page.getByRole('heading',{name:'Dossier indisponible',exact:true}).waitFor();
 assert.equal(await page.locator('[data-dossier-print],[data-gps-map]').count(),0);
 enabled=false;const denied=page.waitForResponse(r=>r.url().endsWith('/functions/v1/coaching')&&r.status()===403);await page.goto('https://piste.test/sessions/'+sessionId);await denied;assert.equal(await page.locator('[data-session-dossier]').count(),0);
 assert.deepEqual(errors,[]);
 assert.equal(calls.filter(([,path])=>path.includes('command')).length,0);
 console.log('PASS Mes pistes: authenticated catalogue, archives/search, readonly seven tabs, PDF, widths 320/390/430, active blind exclusion and revoked access. No live writes.');
}finally{await browser.close();}
