import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://localhost:4173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
await context.addInitScript(()=>{window.__gps=0;for(const key of ['getCurrentPosition','watchPosition'])navigator.geolocation[key]=()=>{window.__gps++;throw Error('Unexpected GPS');};});
const click=name=>page.getByRole('button',{name,exact:true}).click();
if(process.env.SHARE_URL)await page.goto(process.env.SHARE_URL);
await page.goto(base+'/auth/login');await page.getByLabel('Email',{exact:true}).fill('prototype@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('fictif123');await click('Se connecter');await page.waitForURL(base+'/');
async function create(mode,role='driver',trace='direct'){
 await page.goto(base+'/new-session');
 if(await page.locator('[data-coaching="restart"]').count())await page.locator('[data-coaching="restart"]').click();
 await click('Commencer');await page.locator(`[data-coaching-choice="mode"][data-value="${mode}"]`).click();await click('Continuer');await click('Continuer');await page.locator(`[data-coaching-choice="traceType"][data-value="${trace}"]`).click();await click('Continuer');
 if(await page.locator('[data-coaching-choice="preparation"]').count()){await page.locator('[data-coaching-choice="preparation"]').first().click();await click('Continuer');}
 if(role!=='driver')await page.locator(`[data-coaching="creator"][data-role="${role}"]`).click();
 await click('Continuer');await click('Créer la session');await page.getByRole('link',{name:'Ouvrir la préparation',exact:true}).click();
}
const saved=()=>page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('piste.v2.coaching-preparation.v1:'));return key?JSON.parse(localStorage.getItem(key)).snapshot:null;});
async function reload(label){const before=await saved();assert.ok(before,label+' saved');await page.reload();await page.locator('main').waitFor();assert.equal(await page.locator('[data-coaching-no-current-session]').count(),0);const after=await saved();assert.equal(after.draft.session.id,before.draft.session.id);assert.deepEqual(after.draft.session.roles,before.draft.session.roles);assert.deepEqual(after.referenceAssignment,before.referenceAssignment);assert.equal(after.preparationState.gps,'acquiring');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>window.__gps),0);checks.push(label);}
for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['driver','coach','traceur']){await create(mode,role);await reload(mode+'/'+role);}
for(const type of ['accept','decline']){
 await create('normal','traceur','prepared');
 await page.locator(`[data-reference-response][data-command="${type}"] button[type="submit"]`).click();
 await page.locator('dialog [data-confirm]').click();
 const before=await saved();assert.equal(before.referenceAssignment.state.actions.length,2);
 await reload('reference '+type);assert.equal((await saved()).referenceAssignment.state.actions.length,2);
}
await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/piste-preparation-recovery-iphone.png',fullPage:true});
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,errors},null,2));await browser.close();
