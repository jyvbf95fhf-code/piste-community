import {test,expect} from '@playwright/test';import config from '../../playwright.remote.config.mjs';import fs from 'node:fs/promises';
const {accounts}=JSON.parse(await fs.readFile(new URL('../../../.private/qa.json',import.meta.url),'utf8'));
const phase=(p,value)=>expect(p.locator('[data-remote-phase]')).toHaveAttribute('data-remote-phase',value);
const act=async(p,name)=>{await p.bringToFront();await p.locator('[data-remote="'+name+'"]').click();};
async function login(browser,a){const instance=process.env.PISTE_CHROMIUM_PATH?await browser.browserType().launch({...config.use.launchOptions,headless:true}):browser;const context=await instance.newContext({viewport:{width:390,height:844},permissions:['geolocation'],geolocation:{latitude:48.271,longitude:7.777,accuracy:5}}),page=await context.newPage();page.on('dialog',d=>d.accept());page.on('response',async r=>{if(r.url().includes('/functions/v1/coaching')&&r.request().method()==='POST'){const b=r.request().postDataJSON();if(b.operation==='command')console.log(a.role,b.type,r.status(),r.ok()?'ok':JSON.stringify(await r.json()));}});await page.goto('/coaching-shared.html');await page.locator('[name=email]').fill(a.email);await page.locator('[name=password]').fill(a.password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await expect(page.getByRole('heading',{name:'Créer une session Coaching'})).toBeVisible();console.log(a.role+': connected');return {context,page,instance:instance===browser?null:instance};}
for(const mode of ['normal','simple_blind','full_blind'])test(`four isolated browser clients: ${mode}`,async({browser})=>{
 const robots=[];try{for(const a of accounts)robots.push(await login(browser,a));console.log(mode+': four authenticated clients');const [t,d,c,o]=robots;const form=t.page.locator('[data-remote-form=create]');await form.locator('[name=mode]').selectOption(mode);await form.getByRole('button').click();await phase(t.page,'PREPARATION');console.log(mode+': session created');
 for(let i=1;i<robots.length;i++){const f=t.page.locator('[data-remote-form=invite]');await f.locator('[name=role]').selectOption(accounts[i].role);await f.getByRole('button').click();await expect(t.page.locator('#remote-app')).toHaveAttribute('aria-busy','false');await expect(t.page.locator('[data-remote-invitation]')).toBeVisible();const code=await t.page.locator('[data-remote-invitation]').inputValue();const join=robots[i].page.locator('[data-remote-form=join]');await join.locator('[name=invitation]').fill(code);await join.getByRole('button').click();await phase(robots[i].page,'PREPARATION');}
 console.log(mode+': invitations accepted',await t.page.evaluate(()=>document.visibilityState));await t.context.setGeolocation({latitude:48.271,longitude:7.777,accuracy:5});await act(t.page,'start-pose');await phase(t.page,'LAYING');await phase(d.page,'LAYING');
 await t.context.setGeolocation({latitude:48.2711,longitude:7.7771,accuracy:5});await expect.poll(async()=>{await act(t.page,'refresh');return t.page.locator('[data-gps-map]').getAttribute('data-gps-pose');}).toContain('48.2711');
 if(mode==='normal'){await t.context.setOffline(true);await t.context.setGeolocation({latitude:48.2712,longitude:7.7772,accuracy:5});await expect.poll(()=>t.page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('piste-coaching-remote-v1');r.onsuccess=()=>resolve(r.result);r.onerror=reject;});return new Promise(resolve=>{const r=db.transaction('queues').objectStore('queues').getAll();r.onsuccess=()=>{db.close();resolve(JSON.stringify(r.result));};});})).toContain('48.2712');await t.context.setOffline(false);await t.page.reload();await phase(t.page,'LAYING');await act(t.page,'refresh');await expect.poll(()=>t.page.locator('[data-gps-map]').getAttribute('data-gps-pose')).toContain('48.2712');await expect(t.page.getByRole('button',{name:'Reprendre le GPS',exact:true})).toBeVisible();await act(t.page,'resume-gps');}
 console.log(mode+': pose points synchronized');await act(t.page,'finish-pose');await phase(t.page,'TRACK_FINISHED');await act(t.page,'in-place');await phase(d.page,'SEARCH_READY');
 for(const r of robots.slice(1)){await act(r.page,'refresh');const pose=await r.page.locator('[data-remote-pose-distance]').textContent();if(mode==='full_blind'||mode==='simple_blind'&&r===d)expect(pose).toContain('Masquée');else expect(pose).toContain('km');}
 console.log(mode+': visibility checked');await d.context.setGeolocation({latitude:48.271,longitude:7.777,accuracy:5});await act(d.page,'start-search');await phase(d.page,'SEARCH_RUNNING');await phase(c.page,'SEARCH_RUNNING');await expect(o.page.locator('[data-remote=pause-search]')).toHaveCount(0);
 await act(c.page,'pause-search');await expect(d.page.locator('.remote-phase')).toContainText('En pause');await act(d.page,'resume-search');await expect(d.page.locator('.remote-phase')).not.toContainText('En pause');
 await d.context.setGeolocation({latitude:48.27105,longitude:7.77704,accuracy:5});await act(d.page,'finish-search');for(const r of robots){await phase(r.page,'DEBRIEF');await expect(r.page.locator('[data-remote-pose-distance]')).toContainText('km');await expect(r.page.locator('[data-remote-search-distance]')).toContainText('km');await expect(r.page.locator('[data-gps-map]')).toHaveCount(1);}
 console.log(mode+': shared debrief reached');await d.page.screenshot({path:`test-results/robots-${mode}.png`,fullPage:true});
 }catch(error){console.log('ROBOT ERROR',error.message);for(const r of robots){console.log('STATUS',await r.page.locator('[data-remote-status]').textContent({timeout:1000}).catch(()=>'(page closed)'));}throw error;}finally{for(const r of robots){await r.context.close().catch(()=>{});await r.instance?.close().catch(()=>{});}}
});
for(const [scenario,mode] of [['external_traceur','normal'],['external_traceur','simple_blind'],['external_traceur','full_blind'],['external_driver_recorded','normal']])test(`external robots: ${scenario} ${mode}`,async({browser})=>{
 const robots=[];try{
  for(const a of accounts.filter(a=>['driver','coach','observer'].includes(a.role)))robots.push(await login(browser,a));
  const [d,c,o]=robots,recorded=scenario==='external_driver_recorded';
  const form=d.page.locator('[data-remote-form=create]');
  await form.locator('[name=mode]').selectOption(mode);await form.locator('[name=scenario]').selectOption(scenario);
  await expect(form.locator('[name=role]')).toHaveValue('driver');await expect(form.locator('[name=role] option[value=traceur]')).toHaveJSProperty('disabled',true);
  await form.getByRole('button').click();await phase(d.page,'PREPARATION');
  await expect(d.page.locator('[data-remote-external]')).toContainText('aucune position GPS');
  for(let i=1;i<robots.length;i++){
   const f=d.page.locator('[data-remote-form=invite]');await expect(f.locator('[name=role] option[value=traceur]')).toHaveCount(0);
   await f.locator('[name=role]').selectOption(accounts.filter(a=>['driver','coach','observer'].includes(a.role))[i].role);await f.getByRole('button').click();
   await expect(d.page.locator('#remote-app')).toHaveAttribute('aria-busy','false');
   const code=await d.page.locator('[data-remote-invitation]').inputValue(),join=robots[i].page.locator('[data-remote-form=join]');await join.locator('[name=invitation]').fill(code);await join.getByRole('button').click();await phase(robots[i].page,'PREPARATION');
  }
  for(const r of [c,o])await expect(r.page.locator('[data-remote=start-pose], [data-remote=external-ready]')).toHaveCount(0);
  if(recorded){
   await d.context.setGeolocation({latitude:48.271,longitude:7.777,accuracy:5});await act(d.page,'start-pose');await phase(d.page,'LAYING');
   await d.context.setGeolocation({latitude:48.2711,longitude:7.777,accuracy:5});
   await expect.poll(async()=>{await act(d.page,'refresh');return d.page.locator('[data-gps-map]').getAttribute('data-gps-pose');}).toContain('48.2711');
   await act(d.page,'finish-pose');await phase(d.page,'TRACK_FINISHED');await act(d.page,'in-place');
  }else{await expect(d.page.locator('[data-remote-pose-distance]')).toContainText('Tracé de pose indisponible');await act(d.page,'external-ready');}
  await phase(d.page,'SEARCH_READY');await d.context.setGeolocation({latitude:48.271,longitude:7.777,accuracy:5});await act(d.page,'start-search');await phase(d.page,'SEARCH_RUNNING');
  for(const r of [c,o]){await act(r.page,'refresh');await phase(r.page,'SEARCH_RUNNING');if(mode==='full_blind')await expect(r.page.locator('[data-remote-search-distance]')).toContainText('Masquée');else await expect(r.page.locator('[data-remote-search-distance]')).toContainText('km');}
  await expect(o.page.locator('[data-remote=pause-search]')).toHaveCount(0);await act(c.page,'pause-search');await expect(d.page.locator('.remote-phase')).toContainText('En pause');await act(d.page,'resume-search');
  await d.context.setGeolocation({latitude:48.27105,longitude:7.77704,accuracy:5});await act(d.page,'finish-search');
  for(const r of robots){await phase(r.page,'DEBRIEF');await expect(r.page.locator('[data-gps-map]')).toHaveCount(1);await expect(r.page.locator('[data-remote-search-distance]')).toContainText('km');await expect(r.page.locator('[data-remote-pose-distance]')).toContainText(recorded?'km':'Tracé de pose indisponible');}
  console.log(scenario+' '+mode+': debrief, permissions and visibility passed');
 }finally{for(const r of robots){await r.context.close().catch(()=>{});await r.instance?.close().catch(()=>{});}}
});
