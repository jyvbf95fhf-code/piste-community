// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright module.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BASE_URL || 'http://localhost:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const errors=[],external=[],api=[],failed=[],captures=[],checked=[];
context.on('request',r=>{if(!r.url().startsWith(`${base}/`)&&!r.url().startsWith('data:'))external.push(r.url());if(['fetch','xhr','websocket'].includes(r.resourceType()))api.push(r.url());});
context.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
await context.addInitScript(()=>{window.__gps=0;for(const key of ['getCurrentPosition','watchPosition'])navigator.geolocation[key]=()=>{window.__gps++;throw Error('Unexpected GPS');};});
const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const capture=async name=>{await page.evaluate(()=>window.scrollTo(0,0));const path=`screenshots/coaching-${name}-iphone.png`;await page.screenshot({path:new URL(`../${path}`,import.meta.url).pathname,fullPage:false});captures.push(path);if(name==='04-roles'){const fullPath='screenshots/coaching-04-roles-full-iphone.png';await page.screenshot({path:new URL(`../${fullPath}`,import.meta.url).pathname,fullPage:true});captures.push(fullPath);}};
const check=async label=>{
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${label}: overflow`);
 assert.equal(await page.evaluate(()=>window.__gps),0);
 const small=await page.locator('.coaching-flow button,.coaching-flow select,.coaching-flow a').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44;}).map(n=>n.textContent));assert.deepEqual(small,[],`${label}: touch targets`);
 checked.push(label);
};
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const choose=async(field,value)=>page.locator(`[data-coaching-choice="${field}"][data-value="${value}"]`).click();
const start=async()=>{await page.goto(`${base}/new-session`);await click('Commencer');};
const prepareIfNeeded=async()=>{if(/Choisir un (tracé préparé|GPX mock)/.test(await page.locator('h1').innerText())){const options=page.locator('[data-coaching-choice="preparation"]');if(await options.count())await options.first().click();await page.locator('[data-coaching="next"]').click();}};
const toRoles=async(mode,trace)=>{await start();await choose('mode',mode);await click('Continuer');await click('Continuer');await choose('traceType',trace);await click('Continuer');await prepareIfNeeded();};
await page.goto(`${base}/auth/login`);await page.getByLabel('Email',{exact:true}).fill('demo@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('fictif123');await click('Se connecter');await page.waitForURL(`${base}/`);await page.locator('.home-intro').waitFor();await page.locator('.home-brand-reference').evaluate(img=>img.decode());await page.waitForLoadState('networkidle');
const storageBefore=await page.evaluate(()=>JSON.stringify({...localStorage}));
await page.goto(`${base}/new-session`);await check('intro');await capture('01-intro');
await click('Commencer');assert.equal(await page.getByRole('button',{name:'Continuer',exact:true}).isDisabled(),true);await choose('mode','full_blind');await check('mode');await capture('02-mode');
await click('Continuer');assert.equal(await page.getByRole('button',{name:'Continuer',exact:true}).isEnabled(),true);await click('Continuer');assert.equal(await page.getByRole('button',{name:'Continuer',exact:true}).isDisabled(),true);await choose('traceType','gpx');assert.equal(await page.locator('input[type=file]').count(),0);await check('trace');await capture('03-trace');
await click('Continuer');await prepareIfNeeded();await page.locator('[data-coaching="creator"][data-role="coach"]').click();await page.locator('[data-coaching-observer="lea"]').check();await check('roles');await capture('04-roles');
const roles=await page.locator('.coaching-visibility li').allTextContents();assert.ok(roles.some(t=>t.includes('Coach')&&t.includes('Masquée')));assert.ok(roles.some(t=>t.includes('Traceur')&&t.includes('Visible')));assert.ok(roles.some(t=>t.includes('Conducteur')&&t.includes('Masquée')));assert.ok(roles.some(t=>t.includes('Observateur')&&t.includes('Masquée')));
await page.locator('#coaching-driver').selectOption('alex');assert.equal(await page.getByRole('button',{name:'Continuer',exact:true}).isDisabled(),true);assert.match(await page.locator('.coaching-errors').innerText(),/Traceur et Conducteur/);
await page.locator('#coaching-driver').selectOption('camille');await click('Continuer');await check('review');assert.match(await page.locator('.coaching-preparation').innerText(),/réservés au Traceur/);await capture('05-review');
await page.getByRole('button',{name:'Modifier le type de tracé',exact:true}).click();await choose('traceType','prepared');await click('Revenir au récapitulatif');await prepareIfNeeded();assert.match(await page.locator('.coaching-summary').innerText(),/Tracé préparé/);assert.match(await page.locator('.coaching-review-roles').innerText(),/Léa/);
await page.getByRole('button',{name:'Modifier le mode',exact:true}).click();await choose('mode','normal');await click('Revenir au récapitulatif');await prepareIfNeeded();await page.getByRole('button',{name:'Modifier les participants et rôles',exact:true}).click();await page.locator('#coaching-traceur').selectOption('self');await page.locator('#coaching-driver').selectOption('self');await click('Revenir au récapitulatif');assert.equal(await page.getByRole('button',{name:'Créer la session',exact:true}).isEnabled(),true);
await click('Créer la session');await check('created');await capture('06-created');assert.match(await page.locator('h1').innerText(),/Votre session est prête/);assert.match(await page.locator('.coaching-flow').innerText(),/Création simulée/);
await page.reload();assert.match(await page.locator('h1').innerText(),/Créer une session/);
for(const mode of ['normal','simple_blind','full_blind'])for(const trace of ['direct','prepared','gpx','none']){
 await toRoles(mode,trace);await click('Continuer');await click('Créer la session');assert.match(await page.locator('h1').innerText(),/Votre session est prête/);await check(`${mode}/${trace}`);
}
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390],[1280,900]]){
 await page.setViewportSize({width,height});await page.goto(`${base}/new-session`);await check(`intro ${width}`);await click('Commencer');await choose('mode','full_blind');await check(`mode ${width}`);await click('Continuer');await click('Continuer');await choose('traceType','gpx');await check(`trace ${width}`);await click('Continuer');await prepareIfNeeded();await check(`roles ${width}`);await click('Continuer');await check(`review ${width}`);await click('Créer la session');await check(`created ${width}`);
}
assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),storageBefore,'coaching has no persistent storage');
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(api,[]);assert.deepEqual(failed,[]);
const report={passed:true,matrix:12,viewports:6,checks:checked,captures,errors,external,api,failed,gps:0,editing:true,successiveRoles:true,blindConflictsBlocked:true,refreshResets:true,persistentWrites:0};
await writeFile(new URL('../screenshots/coaching-browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
