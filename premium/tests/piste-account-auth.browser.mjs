// Local-only integration: bundled SDK and complete app; synthetic Auth, no live e-mails.
import {chromium} from '@playwright/test';import chromiumBundle from '@sparticuz/chromium';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await chromiumBundle.executablePath(),args:chromiumBundle.args,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],calls=[];
 let enabled=true;
 const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{role:'admin'}};
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');
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
  if(path==='/functions/v1/coaching'){const data=req.postDataJSON();if(!enabled){status=403;json={error:'Compte non autorisé pour ce pilote.'};}else json=data.operation==='profile'?{id:user.id,name:'Compte réel',qa:false}:{sessions:[]};}
  await route.fulfill({status,headers,json});
 });
 await page.addInitScript(()=>localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'expert'})));
 await page.goto('https://piste.test/auth/signup');
 await page.getByRole('button',{name:'Créer mon compte',exact:true}).waitFor();
 await page.getByLabel('Prénom',{exact:true}).fill('Camille');await page.getByLabel('Nom',{exact:true}).fill('Test');
 await page.getByLabel('Email',{exact:true}).fill('new@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-new-password');await page.getByLabel('Confirmer le mot de passe').fill('synthetic-new-password');
 await page.getByRole('button',{name:'Créer mon compte',exact:true}).click();
 await page.getByText(/Si cette inscription peut être acceptée/).waitFor();
 assert(calls.some(([m,p])=>m==='POST'&&p==='/auth/v1/signup'));
 await page.evaluate(()=>localStorage.removeItem('piste.v2.auth.mail-retry'));
 await page.goto('https://piste.test/auth/login');
 await page.getByRole('button',{name:'Se connecter',exact:true}).waitFor();
 assert.equal(await page.getByText('Prêts pour le terrain ?').isVisible(),false);
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByText('Prêts pour le terrain ?').waitFor();
 assert.equal(await page.getByText('Bonjour Compte réel,').isVisible(),true);
 await page.locator('main a[href="/new-session"]').first().click();
 await page.getByRole('heading',{name:'Configurer la session'}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/new-session');
 await page.goto('https://piste.test/auth/forgot');await page.getByRole('button',{name:'Recevoir un lien',exact:true}).waitFor();
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByRole('button',{name:'Recevoir un lien',exact:true}).click();
 await page.getByText(/La limite d’envoi d’e-mails est atteinte/).waitFor();
 await page.getByRole('button',{name:'Recevoir un lien',exact:true}).click();await page.getByText(/Patientez avant de demander un nouvel e-mail/).waitFor();
 assert.equal(calls.filter(([m,p])=>m==='POST'&&p==='/auth/v1/recover').length,1);
 enabled=false;await page.goto('https://piste.test/auth/login');await page.getByRole('button',{name:'Se connecter',exact:true}).waitFor();
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByText(/L’accès au Coaching V2 attend une autorisation/).waitFor();
 assert.equal(await page.getByText('Prêts pour le terrain ?').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: real SDK app login, mock cache ignored, actual identity on home, current Coaching wizard entry, mail quota + cooldown, pending account denied; iPhone viewport, synthetic Auth only.');
}finally{await browser.close();}
