import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://localhost:4173';
const out=fileURLToPath(new URL('../screenshots/community/',import.meta.url));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
await context.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});});
const errors=[],external=[],requests=[];
context.on('request',request=>{if(!request.url().startsWith(`${base}/`)&&!request.url().startsWith('data:'))external.push(request.url());if(['fetch','xhr','websocket'].includes(request.resourceType()))requests.push(request.url());});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const capture=async name=>{
 await page.evaluate(()=>{const nav=document.querySelector('.bottom-nav');if(nav){nav.style.position='static';nav.style.transform='none';nav.style.margin='14px auto 12px';}window.scrollTo(0,0);});
 await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
};
const goto=async path=>{await page.goto(`${base}${path}`);await page.waitForSelector('.app-shell, .auth-shell');};
await goto('/');
if(new URL(page.url()).pathname==='/auth'){
 await page.getByRole('link',{name:'Se connecter',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).fill('community@example.test');
 await page.getByLabel('Mot de passe',{exact:true}).fill('fictif123');
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
}
await goto('/community');
assert.deepEqual(await page.locator('.bottom-nav a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),['/','/dogs','/live','/sessions','/profile']);
assert.ok(await page.locator('.community-post-card').count()>=2);
await capture('feed-390');

await goto('/community/profile/me');
assert.match(await page.locator('main').innerText(),/Nox/);
await capture('profile-me-390');
await page.locator('[name="displayName"]').fill('Sébastien Terrain');
await page.getByRole('button',{name:'Enregistrer mon nom visible'}).click();
assert.match(await page.locator('.community-heading h1').innerText(),/Sébastien Terrain/);

await goto('/community/profile/camille');
assert.match(await page.locator('main').innerText(),/Demande envoyée/);
assert.match(await page.locator('main').innerText(),/Ne plus suivre/);
await capture('profile-other-390');

await goto('/community/contacts');
assert.match(await page.locator('main').innerText(),/Léa/);
await capture('contacts-390');
await page.locator('[data-community-route="contacts"] .community-section').nth(1).screenshot({path:`${out}/contacts-received-390.png`});
await page.locator('[data-community-route="contacts"] .community-section').nth(3).screenshot({path:`${out}/contacts-suggestions-390.png`});
await page.locator('[data-community-action="accept-contact"][data-user-id="lea"]').click();
assert.match(await page.locator('[data-community-person="lea"]').innerText(),/Contact/);
await page.locator('[data-community-action="cancel-contact"][data-user-id="camille"]').click();
assert.match(await page.locator('[data-community-person="camille"]').innerText(),/Suivre|Ne plus suivre/);
assert.doesNotMatch(await page.locator('[data-community-person="camille"]').innerText(),/Demande envoyée/);
const nicolas=page.locator('[data-community-person="nicolas"]');
await nicolas.locator('[data-community-action="contact-request"]').click();
assert.match(await nicolas.innerText(),/Demande envoyée/);

await goto('/community/search?q=trace');
assert.ok(await page.locator('[data-community-result]').count()>0);
await capture('search-390');

await goto('/tracks/prepared%3Atrack-clairiere');
assert.match(await page.locator('main').innerText(),/Partager dans la Communauté/);
await capture('track-source-390');
await goto('/community/post/post-lea-track?share=track');
assert.equal(await page.locator('[data-community-route="post"]').getAttribute('data-share-mode'),'track');
assert.match(await page.locator('main').innerText(),/Lecture seule/);
await capture('shared-track-readonly-390');

await goto('/community/new');
await capture('composer-390');
await page.locator('[data-community-source-picker]').selectOption('track:prepared:track-clairiere');
assert.match(page.url(),/sourceType=track/);
await capture('composer-track-source-390');
await page.locator('[name="shareFields"][value="provenance"]').check();
await page.locator('#community-post-text').fill('Retour de test depuis le créateur de piste.');
await page.locator('#community-post-dog').selectOption('nox');
await page.locator('#community-post-photo').selectOption({index:1});
await page.locator('[name="visibility"][value="community"]').check();
await page.getByRole('button',{name:'Prévisualiser et continuer'}).click();
assert.equal(await page.locator('[data-community-confirm-dialog]').isVisible(),true);
assert.equal(await page.locator('.community-post-card').count(),0,'the composer route itself has not published a post');
await page.getByRole('button',{name:'Retour à l’aperçu'}).click();
assert.equal(await page.locator('[data-community-confirm-dialog]').isVisible(),false);
await page.getByRole('button',{name:'Prévisualiser et continuer'}).click();
await page.locator('[data-community-action="confirm-post"]').click();
await page.waitForURL(/\/community\/post\//);
assert.match(await page.locator('main').innerText(),/Préparé manuellement/);
assert.match(await page.locator('main').innerText(),/Lecture seule/);
await capture('post-detail-390');
const postId=await page.locator('[data-community-post]').getAttribute('data-community-post');
const like=page.locator(`[data-community-action="like"][data-post-id="${postId}"]`);
await like.click();
assert.equal(await page.locator(`[data-community-action="like"][data-post-id="${postId}"]`).getAttribute('aria-pressed'),'true');
await page.locator(`#community-comment-${postId}`).fill('Commentaire mock vérifié.');
await page.getByRole('button',{name:'Publier le commentaire'}).click();
assert.match(await page.locator('main').innerText(),/Commentaire mock vérifié/);
const comment=page.locator('.community-comments li').filter({hasText:'Commentaire mock vérifié.'});
await comment.getByRole('button',{name:'Supprimer'}).click();
assert.doesNotMatch(await page.locator('main').innerText(),/Commentaire mock vérifié/);
await page.locator(`[data-community-action="share-post"][data-post-id="${postId}"]`).click();
await page.waitForSelector('.community-share-fallback');
assert.match(await page.locator('.community-share-fallback h2').innerText(),/publication/i);
await page.locator('.community-share-fallback button').click();
await page.locator(`[data-community-action="share-track"][data-post-id="${postId}"]`).click();
await page.waitForSelector('.community-share-fallback');
assert.match(await page.locator('.community-share-fallback h2').innerText(),/piste/i);
await capture('share-track-390');
await page.locator('.community-share-fallback button').click();

const mobile=[];
for(const width of [320,375,390,430]){
 await page.setViewportSize({width,height:844});
 for(const path of ['/community','/community/profile/me','/community/contacts','/community/new','/community/search?q=Alex',`/community/post/${postId}?share=track`]){
  await goto(path);
  const measure=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,nav:!!document.querySelector('.bottom-nav'),main:document.querySelector('main')?.getBoundingClientRect().width}));
  mobile.push({width,path,...measure});
  assert.ok(measure.scroll<=measure.width,`horizontal overflow ${path} at ${width}px: ${measure.scroll}>${measure.width}`);
  assert.ok(measure.nav,`bottom navigation missing ${path}`);
 }
}
assert.deepEqual(errors,[]);
assert.deepEqual(external,[]);
assert.deepEqual(requests,[]);
const report={captures:['feed-390','profile-me-390','profile-other-390','contacts-390','contacts-received-390','contacts-suggestions-390','composer-390','composer-track-source-390','post-detail-390','search-390','track-source-390','shared-track-readonly-390','share-track-390'],mobile,consoleErrors:errors,externalRequests:external,fetchLikeRequests:requests};
await writeFile(`${out}/browser-report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify({captures:report.captures,mobileChecks:mobile.length,errors,external,requests},null,2));
