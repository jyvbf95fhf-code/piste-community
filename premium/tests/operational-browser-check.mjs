import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const premiumRoot = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = path.join(premiumRoot, 'screenshots', 'operational');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitFor(test, label, timeout = 12000) {
  const end = Date.now() + timeout;
  let lastError;
  while (Date.now() < end) {
    try {
      const value = await test();
      if (value) return value;
    } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

await mkdir(outputDirectory, { recursive: true });
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'piste-operational-chrome-'));
const serverPort = await reservePort();
const debugPort = await reservePort();
const appUrl = `http://127.0.0.1:${serverPort}`;
const server = spawn(process.execPath, ['server.mjs'], { cwd: premiumRoot, env: { ...process.env, PORT: String(serverPort) }, stdio: 'ignore' });
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDirectory}`,
  '--window-size=390,844', 'about:blank'
], { stdio: 'ignore' });

let socket;
const pending = new Map();
const errors = [];
const externalRequests = [];
let nextId = 1;

function cdp(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(new Error(`Chrome DevTools command timed out: ${method}`));
      }, method === 'Page.captureScreenshot' ? 30000 : 12000).unref?.();
  });
}

async function evaluate(expression) {
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.result?.exceptionDetails) throw new Error(response.result.exceptionDetails.text || 'Browser evaluation failed');
  return response.result?.result?.value;
}

async function click(selector) {
  const found = await evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e) return false; e.click(); return true; })()`);
  assert.equal(found, true, `Browser element not found: ${selector}`);
}

async function waitSelector(selector) {
  await waitFor(() => evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`), selector);
}

async function capture(name, { full = false } = {}) {
  const viewport = await evaluate(`({width:innerWidth,height:innerHeight})`);
  const result = await cdp('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: full, fromSurface: true,
    ...(full ? {} : { clip: { x: 0, y: 0, width: viewport.width, height: viewport.height, scale: 1 } })
  });
  await writeFile(path.join(outputDirectory, name), Buffer.from(result.result.data, 'base64'));
}

async function setViewport(width) {
  await cdp('Emulation.setDeviceMetricsOverride', {
    width, height: 844, deviceScaleFactor: 3, mobile: true,
    screenWidth: width, screenHeight: 844
  });
  await new Promise(resolve => setTimeout(resolve, 80));
  await evaluate(`window.scrollTo(0,document.documentElement.scrollHeight)`);
  await new Promise(resolve => setTimeout(resolve, 50));
  const measurements = await evaluate(`(() => {
    const stage=document.querySelector('[data-operational-cockpit-stage]');
    const map=document.querySelector('.operational-map .prep-map-canvas');
    const action=document.querySelector('[data-operational-action="pause"], [data-operational-action="resume"]');
    const nav=document.querySelector('.bottom-nav');
    const shell=document.querySelector('.app-shell');
    const overlay=document.querySelector('[data-operational-overlay-controls]');
    const navStyle=nav?getComputedStyle(nav).display:'none';
    return {
      viewport:innerWidth,
      viewportHeight:innerHeight,
      document:document.documentElement.scrollWidth,
      body:document.body.scrollWidth,
      map:map?.getBoundingClientRect().width||0,
      mapHeight:map?.getBoundingClientRect().height||0,
      mapLeft:map?.getBoundingClientRect().left||0,
      stageTop:stage?.getBoundingClientRect().top||0,
      stageBottom:stage?.getBoundingClientRect().bottom||0,
      actionBottom:action?.getBoundingClientRect().bottom||0,
      navStyle,
      shellClass:shell?.className||'',
      overlay:!!overlay,
      corridor:!!overlay?.querySelector('[data-operational-corridor-toggle]'),
      progress:!!overlay?.querySelector('[data-operational-map-mode="progress"]'),
      event:!!overlay?.querySelector('[data-operational-map-mode="event"]'),
      metrics:!!overlay?.querySelector('[data-operational-chrono]')
    };
  })()`);
  assert.equal(measurements.document <= width && measurements.body <= width, true, `Horizontal overflow at ${width}px: ${JSON.stringify(measurements)}`);
  assert.equal(measurements.actionBottom <= measurements.stageBottom, true, `Cockpit actions spill out of the map stage at ${width}px: ${JSON.stringify(measurements)}`);
  assert.equal(measurements.map >= width - 2 && measurements.mapLeft <= 1, true, `Mission map should span the viewport at ${width}px: ${JSON.stringify(measurements)}`);
  assert.equal(measurements.mapHeight >= measurements.viewportHeight * .85, true, `Mission map should fill the operational viewport at ${width}px: ${JSON.stringify(measurements)}`);
  assert.equal(measurements.navStyle, 'none', `Bottom navigation should yield its area to the active cockpit at ${width}px: ${JSON.stringify(measurements)}`);
  assert.equal(measurements.overlay && measurements.corridor && measurements.progress && measurements.event && measurements.metrics, true, `Map overlay controls or metrics missing at ${width}px: ${JSON.stringify(measurements)}`);
  return measurements;
}

try {
  await waitFor(async () => (await fetch(appUrl)).ok, 'local V2 dev server');
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    return response.ok ? response.json() : null;
  }, 'Chrome DevTools endpoint');
  let targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  let page = targets.find(target => target.type === 'page');
  if (!page) {
    await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' });
    targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    page = targets.find(target => target.type === 'page');
  }
  assert.ok(page?.webSocketDebuggerUrl, 'Chrome did not expose a page target');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'Browser exception');
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args?.map(arg => arg.value || arg.description || '').join(' ') || 'Console error');
    }
    if (message.method === 'Network.requestWillBeSent') {
      const requestUrl = message.params.request?.url || '';
      if (requestUrl.startsWith('http') && !requestUrl.startsWith(appUrl)) externalRequests.push(requestUrl);
    }
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  // The bundled Chrome 96 predates structuredClone; current target browsers provide it.
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "if(!globalThis.structuredClone)globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));" });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 });
  await cdp('Page.navigate', { url: `${appUrl}/` });
  await waitSelector('.auth-entry');
  await evaluate(`localStorage.setItem('piste.v2.mock-session', JSON.stringify({version:1,authenticated:true,profile:'expert',name:'Sébastien'}))`);
  await cdp('Page.navigate', { url: `${appUrl}/` });
  await waitSelector('.home-shell');
  assert.equal(await evaluate(`document.querySelectorAll('.discovery-cta').length`), 1);
  assert.equal(await evaluate(`document.querySelector('.discovery-cta')?.getAttribute('href')`), '/operational');
  await capture('operational-home-iphone.png');

  await click('.discovery-cta');
  await waitSelector('[data-operational-view="entry"]');
  const entryCardChecks = [];
  for (const width of [320, 375, 390, 430]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:3,mobile:true,screenWidth:width,screenHeight:844});
    const cards = await evaluate(`(() => {
      const choices=document.querySelector('.operational-entry-choices');
      const links=[...document.querySelectorAll('[data-operational-entry-choice]')];
      const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,choices:choices&&rect(choices),cards:links.map(link=>({box:rect(link),title:rect(link.querySelector('strong')),subtitle:rect(link.querySelector('small')),chevron:rect(link.children[2]),titleText:link.querySelector('strong')?.innerText,subtitleText:link.querySelector('small')?.innerText,scrollWidth:link.scrollWidth,clientWidth:link.clientWidth}))};
    })()`);
    assert.equal(cards.cards.length,2,`Two entry cards should render at ${width}px: ${JSON.stringify(cards)}`);
    assert.equal(cards.document<=width&&cards.body<=width,true,`Operational entry overflow at ${width}px: ${JSON.stringify(cards)}`);
    assert.equal(cards.cards[0].box.bottom < cards.cards[1].box.top,true,`Entry cards should be vertically separated at ${width}px: ${JSON.stringify(cards)}`);
    for(const [index,card] of cards.cards.entries()){
      assert.equal(card.box.width>=cards.choices.width-2,true,`Entry card ${index} should fill the useful width at ${width}px: ${JSON.stringify(cards)}`);
      assert.equal(card.box.height>=84,true,`Entry card ${index} should have a comfortable touch area at ${width}px: ${JSON.stringify(cards)}`);
      assert.equal(card.subtitle.top>=card.title.bottom,true,`Entry subtitle should sit on its own line at ${width}px: ${JSON.stringify(cards)}`);
      assert.equal(card.scrollWidth<=card.clientWidth,true,`Entry card text should not be clipped horizontally at ${width}px: ${JSON.stringify(cards)}`);
      assert.equal(Math.abs((card.chevron.top+card.chevron.bottom)/2-(card.box.top+card.box.bottom)/2)<12,true,`Entry chevron should remain centered at ${width}px: ${JSON.stringify(cards)}`);
    }
    entryCardChecks.push(cards);
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844});
  await new Promise(resolve=>setTimeout(resolve,80));
  await capture('operational-entry-iphone.png');
  await click('a[href="/operational/new"]');
  await waitSelector('[data-operational-start-form]');
  await capture('operational-start-iphone.png');
  assert.equal(await evaluate(`document.querySelector('[data-operational-start-form] [name="lastKnownDescription"]').required`), false);
  for(const width of [320,375,390,430]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:3,mobile:true,screenWidth:width,screenHeight:844});
    const quick=await evaluate(`(() => { window.scrollTo(0,document.documentElement.scrollHeight); const button=document.querySelector('[data-operational-start-form] button[type="submit"]')?.getBoundingClientRect(); const nav=document.querySelector('.bottom-nav')?.getBoundingClientRect(); return {width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,buttonBottom:button?.bottom||0,navTop:nav?.top||innerHeight}; })()`);
    assert.equal(quick.document<=width&&quick.body<=width,true,`Quick-start overflow at ${width}px: ${JSON.stringify(quick)}`);
    assert.equal(quick.buttonBottom<=quick.navTop,true,`Quick-start submit is behind bottom nav at ${width}px: ${JSON.stringify(quick)}`);
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844});
  await evaluate('window.scrollTo(0,0)');
  await evaluate(`(() => { const f=document.querySelector('[data-operational-start-form]'); f.elements.interventionAddress.value='Poste de commandement, Fontainebleau'; f.elements.interventionAddress.dispatchEvent(new Event('input',{bubbles:true})); f.elements.disappearanceAt.value=new Date(Date.now()-2*3600000).toISOString().slice(0,16); return true; })()`);
  assert.equal(await evaluate(`['Apple Plans','Google Maps','Waze'].every(name=>[...document.querySelectorAll('[data-operational-intake-navigation] a')].some(link=>link.innerText.includes(name)))`),true,'quick start address offers all navigation providers before saving');
  await capture('operational-intake-address-iphone.png');
  await click('[data-operational-start-form] button[type="submit"]');
  await waitSelector('[data-operational-status="Brouillon"]');
  assert.equal(await evaluate(`document.querySelector('[data-operational-track-age]')?.innerText.includes('non renseigné')`), false, 'valid disappearance time computes a draft age estimate');
  assert.equal(await evaluate(`Boolean(document.querySelector('a[href*="maps.apple.com"]')&&document.querySelector('a[href*="google.com/maps"]')&&document.querySelector('a[href*="waze.com"]'))`), true, 'intervention address exposes the three navigation providers');
  assert.equal(await evaluate(`document.querySelector('[data-operational-view="mission"]')?.innerText.includes('Départ confirmé')`), false, 'intervention address must not be shown as confirmed track origin');
  await click('[data-operational-action="start"]');
  await waitSelector('[data-operational-status="En cours"]');
  const missionUrl = await evaluate('location.pathname');
  const missionId = decodeURIComponent(missionUrl.split('/').at(-1));
  await capture('operational-cockpit-complete-iphone.png');
  await capture('operational-map-overlays-iphone.png');
  await capture('operational-metrics-iphone.png');

  const viewportChecks = [];
  for (const width of [320, 375, 390, 430]) {
    viewportChecks.push(await setViewport(width));
    if (width === 390) await capture('operational-active-safe-area-iphone.png');
  }
  await setViewport(390);

  await click('[data-operational-map-mode="progress"]');
  await evaluate(`(() => { const map=document.querySelector('.operational-map svg[data-operational-interactive="true"]'); const r=map.getBoundingClientRect(); map.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*.4,clientY:r.top+r.height*.55})); })()`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[data-operational-progress]'))`), 'mock progress point');
  await click('[data-operational-map-mode="event"]');
  await evaluate(`(() => { const s=document.querySelector('[data-operational-event-type]'); s.value='Indice'; s.dispatchEvent(new Event('change',{bubbles:true})); const n=document.querySelector('[data-operational-event-note]'); n.value='Sous la lisière'; n.dispatchEvent(new InputEvent('input',{bubbles:true})); })()`);
  await evaluate(`(() => { const map=document.querySelector('.operational-map svg[data-operational-interactive="true"]'); const r=map.getBoundingClientRect(); map.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*.57,clientY:r.top+r.height*.62})); })()`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[data-operational-event="Indice"]'))`), 'terrain event marker');
  await click('[data-operational-corridor-toggle="on"]');
  await waitSelector('.operational-map-corridor-label');
  assert.equal(await evaluate(`document.querySelector('[data-operational-corridor-toggle]')?.getAttribute('aria-pressed')`), 'true');
  assert.equal(await evaluate(`document.querySelector('[data-operational-corridor-toggle]')?.innerText.includes('ESTIMÉ · simulation')`), true);
  await capture('operational-corridor-on-iphone.png');
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-operational-action="lock-screen"]'))`), true);
  assert.equal(await evaluate(`document.body.innerText.includes('Mode terrain')`), false, 'old terrain-mode wording is absent');
  await evaluate(`document.querySelector('.operational-map-panel')?.scrollIntoView({block:'center'})`);
  await capture('operational-large-map-iphone.png');
  await evaluate(`document.querySelector('[data-operational-action="lock-screen"]')?.scrollIntoView({block:'center'})`);
  await capture('operational-lock-button-iphone.png');
  await click('[data-operational-action="pause"]');
  await waitSelector('[data-operational-tracking-state="paused"]');
  const pausedChrono = await evaluate(`document.querySelector('[data-operational-chrono]')?.textContent`);
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-operational-map-mode="progress"]'))`), false);
  await click('[data-operational-map-mode="event"]');
  await evaluate(`(() => { const s=document.querySelector('[data-operational-event-type]'); s.value='Fin de piste'; s.dispatchEvent(new Event('change',{bubbles:true})); const n=document.querySelector('[data-operational-event-note]'); n.value='Pause · observation'; n.dispatchEvent(new InputEvent('input',{bubbles:true})); })()`);
  await evaluate(`(() => { const map=document.querySelector('.operational-map svg[data-operational-interactive="true"]'); const r=map.getBoundingClientRect(); map.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*.62,clientY:r.top+r.height*.68})); })()`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[data-operational-event="Fin de piste"]'))`), 'manual event during pause');
  assert.equal(await evaluate(`document.querySelector('[data-operational-journal] li:last-child small')?.textContent.includes('T+')`), true);
  assert.equal(await evaluate(`document.querySelector('[data-operational-chrono]')?.textContent`), pausedChrono, 'chrono stays frozen during pause');
  await capture('operational-paused-iphone.png');
  const lockedSnapshot = await evaluate(`(() => ({id:document.querySelector('[data-operational-mission-id]')?.dataset.operationalMissionId,state:document.querySelector('[data-operational-tracking-state]')?.dataset.operationalTrackingState,chrono:document.querySelector('[data-operational-chrono]')?.textContent,events:document.querySelectorAll('[data-operational-journal] li').length,corridor:Boolean(document.querySelector('.operational-map-corridor-label'))}))()`);
  await click('[data-operational-action="lock-screen"]');
  await waitSelector('[data-operational-terrain]');
  for (const width of [320, 375, 390, 430]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height:844, deviceScaleFactor:3, mobile:true, screenWidth:width, screenHeight:844 });
    const terrain=await evaluate(`(() => { const root=document.querySelector('[data-operational-terrain]'); const buttons=[...root.querySelectorAll('button')].map(button=>button.getBoundingClientRect()); return {width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,buttons:buttons.map(rect=>({left:rect.left,right:rect.right,bottom:rect.bottom}))}; })()`);
    assert.equal(terrain.document<=width&&terrain.body<=width,true,`Terrain mode overflow at ${width}px: ${JSON.stringify(terrain)}`);
    assert.equal(terrain.buttons.every(button=>button.left>=0&&button.right<=width&&button.bottom<=844),true,`Terrain controls clipped at ${width}px: ${JSON.stringify(terrain)}`);
    if(width===390)await capture('operational-locked-screen-iphone.png');
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844 });
  await capture('operational-locked-screen-iphone.png');
  assert.equal(await evaluate(`document.querySelector('[data-operational-terrain]')?.innerText.includes('PISTE · ÉCRAN VERROUILLÉ')`), true);
  assert.equal(await evaluate(`document.querySelector('[data-operational-terrain]')?.innerText.includes('Verrouillage simulé · l’écran de l’appareil reste actif.')`), false);
  assert.equal(await evaluate(`(() => { const root=document.querySelector('[data-operational-terrain]'); return root.querySelectorAll('button').length===1&&Boolean(root.querySelector('[data-operational-unlock]'))&&!root.querySelector('[data-operational-action]'); })()`), true, 'locked screen only exposes the hold-to-unlock control');
  await click('[data-operational-unlock]');
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-operational-terrain]'))`), true, 'a simple tap must not unlock');
  await evaluate(`(() => { const button=document.querySelector('[data-operational-unlock]'); button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:77,button:0})); })()`);
  await new Promise(resolve=>setTimeout(resolve,500));
  await evaluate(`(() => { const button=document.querySelector('[data-operational-unlock]'); button.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:77,button:0})); })()`);
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-operational-terrain]'))`), true, 'releasing before 2 seconds must keep the screen locked');
  await evaluate(`(() => { const button=document.querySelector('[data-operational-unlock]'); button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:78,button:0})); })()`);
  await new Promise(resolve=>setTimeout(resolve,850));
  await capture('operational-unlock-hold-iphone.png');
  await new Promise(resolve=>setTimeout(resolve,1250));
  await evaluate(`(() => { const button=document.querySelector('[data-operational-unlock]'); button?.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:78,button:0})); return true; })()`);
  await waitSelector('[data-operational-view="mission"]');
  const unlockedSnapshot = await evaluate(`(() => ({id:document.querySelector('[data-operational-mission-id]')?.dataset.operationalMissionId,state:document.querySelector('[data-operational-tracking-state]')?.dataset.operationalTrackingState,chrono:document.querySelector('[data-operational-chrono]')?.textContent,events:document.querySelectorAll('[data-operational-journal] li').length,corridor:Boolean(document.querySelector('.operational-map-corridor-label'))}))()`);
  assert.deepEqual(unlockedSnapshot,lockedSnapshot,'unlocking must return to the same mission without changing tracking state, chrono, events, or corridor');
  await waitSelector('[data-operational-view="mission"]');
  assert.equal(await evaluate(`document.querySelector('[data-operational-tracking-state]')?.dataset.operationalTrackingState`), 'paused');
  await click('[data-operational-action="resume"]');
  await waitSelector('[data-operational-tracking-state="active"]');
  await click('[data-operational-action="stop"]');
  await waitSelector('[data-operational-status="À compléter"]');
  assert.equal(await evaluate(`document.querySelector('[data-operational-action="complete"]')?.textContent.includes('Terminer la mission')`), true);
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-operational-action="pause"], [data-operational-action="resume"], [data-operational-action="stop"]'))`), false);
  await click('[data-operational-gpx-attach]');
  await waitSelector('.operational-gpx-attached');
  await click('[data-operational-weather-toggle="on"]');
  await waitFor(() => evaluate(`document.querySelector('.operational-weather-panel')?.innerText.includes('8 km/h · simulation')`), 'mock weather panel');
  const complete = await evaluate(`document.querySelector('[data-operational-action="complete"]')?.disabled || false`);
  assert.equal(complete, false, 'optional details must not block completion');
  await click('[data-operational-details] summary');
  await evaluate(`(() => { const fields=document.querySelector('[data-operational-details-form]'); fields.elements.sourceManufacturer.value='Garmin'; fields.elements.sourceDeviceModel.value='Fenix 8'; fields.elements.sourceDeviceType.value='external_gps'; fields.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); return true; })()`);
  await waitFor(() => evaluate(`document.querySelector('[data-operational-details-form] [name="sourceManufacturer"]')?.value==='Garmin'`), 'mock device source metadata');
  await waitSelector('[data-operational-evaluation-form]');
  for(const width of [320,375,390,430]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:3,mobile:true,screenWidth:width,screenHeight:844});
    const completion=await evaluate(`(() => { window.scrollTo(0,document.documentElement.scrollHeight); const button=document.querySelector('[data-operational-evaluation-form]>.button')?.getBoundingClientRect(); const nav=document.querySelector('.bottom-nav')?.getBoundingClientRect(); return {width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,form:document.querySelector('[data-operational-evaluation-form]')?.getBoundingClientRect().width||0,buttonBottom:button?.bottom||0,navTop:nav?.top||innerHeight}; })()`);
    assert.equal(completion.document<=width&&completion.body<=width,true,`Completion form overflow at ${width}px: ${JSON.stringify(completion)}`);
    assert.equal(completion.buttonBottom<=completion.navTop,true,`Evaluation submit is behind bottom nav at ${width}px: ${JSON.stringify(completion)}`);
    if(width===390)await capture('operational-completion-evaluation-iphone.png',{full:true});
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844});
  await evaluate(`(() => { const f=document.querySelector('[data-operational-evaluation-form]'); f.elements['dog.motivation'].value='4'; f.elements['dog.comment'].value='Motivation stable.'; f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); return true; })()`);
  await waitFor(() => evaluate(`document.querySelector('[data-operational-evaluation-form] select[name="dog.motivation"]')?.value==='4'`), 'saved dog evaluation');
  await click('[data-operational-action="complete"]');
  await waitSelector('[data-operational-status="Terminée"]');
  await click('[data-operational-action="archive"]');
  await waitSelector('[data-operational-status="Archivée"]');
  await click(`a[href="/operational/missions/${encodeURIComponent(missionId)}/replay"]`);
  await waitSelector('[data-operational-replay]');
  for (const width of [320, 375, 390, 430]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height:844, deviceScaleFactor:3, mobile:true, screenWidth:width, screenHeight:844 });
    const replay=await evaluate(`({width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);
    assert.equal(replay.document<=width&&replay.body<=width,true,`Replay overflow at ${width}px: ${JSON.stringify(replay)}`);
    if(width===390)await capture('operational-replay-corridor-iphone.png');
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844 });
  assert.equal(await evaluate(`document.querySelector('[data-operational-replay]')?.innerText.includes('ESTIMÉ · simulation')`), true);
  assert.equal(await evaluate(`document.querySelector('[data-operational-replay]')?.innerText.includes('Motivation stable.')`), true, 'replay includes the saved optional comment');

  const sessionList = await fetch(`${appUrl}/sessions`);
  assert.equal(sessionList.status, 200);
  const sessionProjection = await evaluate(`(() => { history.pushState({},'','/sessions'); dispatchEvent(new PopStateEvent('popstate')); return true; })()`);
  assert.equal(sessionProjection, true);
  await waitSelector('[data-consultation-view="sessions"]');
  await click('[data-session-filter="Archivées"]');
  await waitFor(() => evaluate(`Boolean(document.querySelector('[data-session-kind="operational"]'))`), 'operational archive projection');
  assert.equal(await evaluate(`document.querySelector('[data-session-kind="operational"]')?.getAttribute('href')`), `/sessions/${encodeURIComponent(missionId)}`);
  await capture('operational-sessions-archive-iphone.png');

  await evaluate(`(() => { history.pushState({},'','/operational/prepare'); dispatchEvent(new PopStateEvent('popstate')); return true; })()`);
  await waitSelector('[data-operational-intake-form="prepared"]');
  await capture('operational-prepared-mission-iphone.png');
  for(const width of [320,375,390,430]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:3,mobile:true,screenWidth:width,screenHeight:844});
    const preparedForm=await evaluate(`(() => { window.scrollTo(0,document.documentElement.scrollHeight); const button=document.querySelector('[data-operational-intake-form="prepared"] button[type="submit"]')?.getBoundingClientRect(); const nav=document.querySelector('.bottom-nav')?.getBoundingClientRect(); return {width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,buttonBottom:button?.bottom||0,navTop:nav?.top||innerHeight}; })()`);
    assert.equal(preparedForm.document<=width&&preparedForm.body<=width,true,`Prepared mission overflow at ${width}px: ${JSON.stringify(preparedForm)}`);
    assert.equal(preparedForm.buttonBottom<=preparedForm.navTop,true,`Prepared mission submit is behind bottom nav at ${width}px: ${JSON.stringify(preparedForm)}`);
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844});
  await evaluate('window.scrollTo(0,0)');
  assert.equal(await evaluate(`document.querySelector('[data-operational-intake-form="prepared"] [name="searchedPerson"]').required`),false);
  await evaluate(`(() => { const form=document.querySelector('[data-operational-intake-form="prepared"]'); form.elements.dogId.value='nox'; form.elements.interventionAddress.value='Gare, Fontainebleau'; form.elements.interventionAddress.dispatchEvent(new Event('input',{bubbles:true})); form.elements.probableTrackStart.value='Bois au nord'; return true; })()`);
  assert.equal(await evaluate(`['Apple Plans','Google Maps','Waze'].every(name=>[...document.querySelectorAll('[data-operational-intake-navigation] a')].some(link=>link.innerText.includes(name)))`),true,'prepared mission address offers all navigation providers before saving');
  await evaluate(`document.querySelector('[data-operational-intake-form="prepared"]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);
  await waitSelector('[data-operational-status="Brouillon"]');
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-operational-action="start"]'))`),true,'prepared mission still requires explicit tracking start');
  assert.equal(await evaluate(`document.querySelector('[data-operational-details-form] [name="probableTrackStart"]')?.value==='Bois au nord'`),true);

  const storage = await evaluate(`JSON.stringify({local:Object.keys(localStorage),session:Object.keys(sessionStorage),values:Object.values(localStorage).join(' ')})`);
  const parsedStorage = JSON.parse(storage);
  assert.deepEqual(parsedStorage.local, ['piste.v2.mock-session']);
  assert.deepEqual(parsedStorage.session, []);
  assert.equal(/Mission terrain|Indice|Nox|Couloir olfactif/.test(parsedStorage.values), false, 'mission data must not be persisted in browser storage');
  assert.deepEqual(externalRequests, [], `Unexpected external/API/GPS requests: ${externalRequests.join(', ')}`);
  assert.deepEqual(errors, [], `Browser console/runtime errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({
    browser: version.Browser,
    status: 'PASS',
    entryCardChecks,
    viewportChecks,
    missionId,
    externalRequests,
    consoleErrors: errors,
    screenshots: [
      'operational-home-iphone.png',
      'operational-entry-iphone.png',
      'operational-start-iphone.png',
      'operational-active-iphone.png',
      'operational-large-map-iphone.png',
      'operational-lock-button-iphone.png',
      'operational-active-events-corridor-iphone.png',
      'operational-paused-manual-event-iphone.png',
      'operational-locked-screen-iphone.png',
      'operational-unlock-hold-iphone.png',
      'operational-replay-corridor-iphone.png',
      'operational-sessions-archive-iphone.png'
    ].map(name => path.join(outputDirectory, name))
  }, null, 2));
} finally {
  if (errors.length) try { console.error('Browser diagnostics:', JSON.stringify({ errors, location: await evaluate('location.href').catch(error => error.message), title: await evaluate('document.title').catch(error => error.message), body: await evaluate('document.body.innerText').catch(error => error.message), resources: await evaluate('performance.getEntriesByType("resource").map(x=>[x.name,x.responseStatus||0])').catch(error => error.message) })); } catch {}
  try { socket?.close(); } catch {}
  if (!chrome.killed && chrome.exitCode === null) {
    chrome.kill('SIGTERM');
    await new Promise(resolve => {
      const timer = setTimeout(() => { chrome.kill('SIGKILL'); resolve(); }, 4000);
      chrome.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
  server.kill('SIGTERM');
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
