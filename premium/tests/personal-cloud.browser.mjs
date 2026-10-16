// Local-only integration: bundled SDK and complete app; synthetic Auth, no live e-mails.
import {chromium} from '@playwright/test';import chromiumBundle from '@sparticuz/chromium';
import {createMemoryPersistenceServer} from './helpers/persistence-memory-repository.mjs';
import {createRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await chromiumBundle.executablePath(),args:chromiumBundle.args,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],calls=[];
 const server=createMemoryPersistenceServer();
 let enabled=true; const sessionId='33333333-3333-4333-8333-333333333333'; let projection;
 const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{role:'admin'}};
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');
 projection=projectRemoteSession(createRemoteSession({id:sessionId,owner:{id:user.id,name:'QA'},role:'driver',mode:'normal',dogName:'Nox',scenario:'external_traceur',now:Date.now()}),user.id,Date.now());
 const headers={'access-control-allow-origin':'https://piste.test','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,OPTIONS'};
 page.setDefaultTimeout(12000);page.on('pageerror',e=>{errors.push(e.message);console.error('APP ERROR:',e.message);});
 await page.route('https://piste.test/**',async route=>{const path=new URL(route.request().url()).pathname;const source=path.endsWith('.mjs')||path.endsWith('.css')||path.endsWith('.js')||path.includes('/assets/')||path.endsWith('.html')?path:'/index.html';try{const body=await readFile(new URL('..'+source,import.meta.url));await route.fulfill({body,contentType:source.endsWith('.mjs')||source.endsWith('.js')?'text/javascript':source.endsWith('.css')?'text/css':source.endsWith('.html')?'text/html':'image/png'});}catch{await route.fulfill({status:404,body:''});}});
 await page.route('https://shnwqdkiapgcftbnhilh.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;calls.push([req.method(),path]);
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
  let json=user,status=200;
  if(path==='/auth/v1/token')json={access_token:token,refresh_token:'synthetic',expires_in:3600,token_type:'bearer',user};
  if(path==='/auth/v1/signup')json={...user,id:'22222222-2222-4222-8222-222222222222',identities:[]};
  if(path==='/auth/v1/recover'){status=429;json={code:'over_email_send_rate_limit',msg:'email rate limit exceeded'};}
  if(path==='/functions/v1/personal-data'){const body=req.postDataJSON(),r=server.client(user.id);try{json=body.operation==='list'?await r.list(body):body.operation==='read'?{record:await r.read(body)}:{record:await r[body.operation](body)};}catch(e){status=e.status||500;json={error:e.message};}}
  if(path==='/functions/v1/coaching'){const data=req.postDataJSON();if(!enabled){status=403;json={error:'Compte non autorisé pour ce pilote.'};}else json=data.operation==='profile'?{id:user.id,name:'Compte réel',qa:false}:data.operation==='list'?{sessions:[projection]}:{projection};}
  await route.fulfill({status,headers,json});
 });

 await page.goto('https://piste.test/auth/login');
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByText('Prêts pour le terrain ?').waitFor();

 await page.goto('https://piste.test/profile/dogs');
 await page.locator('[data-profile-primary-dog]').selectOption('nox');
 await page.goto('https://piste.test/profile/sync');await page.getByRole('heading',{name:'Sauvegardes cloud',exact:true}).waitFor();
 await page.getByRole('button',{name:'Afficher les chiens existants',exact:true}).click();
 await page.locator('[data-personal-cloud-form="backup"] input[value="dog:nox"]').check();await page.locator('[data-personal-cloud-form="backup"] input[value="profile:self"]').check();
 await page.getByRole('button',{name:'Sauvegarder la sélection',exact:true}).click();await page.getByText('2 élément(s) sauvegardé(s) en ligne.',{exact:true}).waitFor();
 const dog=(await server.client(user.id).list({kind:'dog'})).records[0];
 await page.goto('https://piste.test/profile');
 await page.evaluate(owner=>{localStorage.removeItem('piste-v2-profile:'+owner);localStorage.removeItem('piste-v2-dogs:'+owner);},user.id);await page.reload();
 await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('piste-v2-persistence-v1');r.onsuccess=resolve;r.onerror=reject;}));
 await page.goto('https://piste.test/profile/sync');await page.getByRole('button',{name:'Charger mes sauvegardes',exact:true}).click();await page.getByText('Données en ligne chargées. Choisissez les éléments à restaurer.',{exact:true}).waitFor();
 for(const input of await page.locator('[data-personal-cloud-form="restore"] input').all())await input.check();
 await page.getByRole('button',{name:'Restaurer la sélection',exact:true}).click();await page.getByText('2 élément(s) restauré(s). Les dossiers OPS restent en lecture seule.',{exact:true}).waitFor();
 await page.goto('https://piste.test/profile/dogs');assert.equal(await page.locator('[data-profile-primary-dog]').inputValue(),dog.id);
 await page.reload();assert.equal(await page.locator('[data-profile-primary-dog]').inputValue(),dog.id);
 assert.deepEqual(errors,[]);console.log('PASS full-app cloud UI: explicit existing-dog selection, ordered backup, device-local reset, download and selected restore, canonical dog reference and reload. API intercepted, no live writes.');
}finally{await browser.close();}
