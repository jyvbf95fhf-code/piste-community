// Local integration only: real bundled SDK, synthetic Auth responses, no live account.
import {chromium} from '@playwright/test';
import chromiumBundle from '@sparticuz/chromium';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await chromiumBundle.executablePath(),args:chromiumBundle.args,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),requests=[];
 const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
 await page.route('https://piste.test/**',async route=>{const path=new URL(route.request().url()).pathname;const file=new URL('..'+path,import.meta.url);const body=await readFile(file);await route.fulfill({body,contentType:path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});});
 await page.route('https://shnwqdkiapgcftbnhilh.supabase.co/**',async route=>{const req=route.request();requests.push([req.method(),new URL(req.url()).pathname]);await route.fulfill({status:200,headers:{'access-control-allow-origin':'https://piste.test','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,OPTIONS'},json:req.url().includes('/logout')?{}:user});});
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');
 await page.goto('https://piste.test/coaching-recovery.html#type=recovery&access_token='+token+'&refresh_token=synthetic&expires_in=3600&token_type=bearer');
 await page.locator('[data-recovery-form]').waitFor({state:'visible',timeout:10000});
 assert.equal(new URL(page.url()).hash,'');
 await page.getByLabel('Nouveau mot de passe',{exact:true}).fill('synthetic-test-password');
 await page.getByLabel('Confirmer le mot de passe').fill('synthetic-test-password');
 await page.getByRole('button',{name:'Enregistrer le nouveau mot de passe'}).click();
 await page.locator('[data-recovery-done]').waitFor({state:'visible'});
 assert(requests.some(([method,path])=>method==='PUT'&&path==='/auth/v1/user'));
 assert(requests.some(([method,path])=>method==='POST'&&path==='/auth/v1/logout'));
 await page.goto('https://piste.test/coaching-recovery.html#error=access_denied&error_code=otp_expired');
 await page.getByText(/Lien expiré ou déjà utilisé/).waitFor();
 assert.equal(await page.locator('[data-recovery-form]').isVisible(),false);
 await page.locator('[data-recovery-request]').waitFor({state:'visible'});
 console.log('PASS: bundled SDK callback, clean URL, update, signout, expired link at iPhone viewport (synthetic Auth).');
}finally{await browser.close();}
