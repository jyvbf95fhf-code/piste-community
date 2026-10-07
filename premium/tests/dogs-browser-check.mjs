import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DOGS_BASE_URL || 'http://localhost:4173';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const errors = [], external = [], apiCalls = [];
context.on('request', request => {
  if (!request.url().startsWith(`${base}/`) && !request.url().startsWith('data:')) external.push(request.url());
  if (['fetch', 'xhr', 'websocket'].includes(request.resourceType())) apiCalls.push(request.url());
});
await context.addInitScript(() => {
  window.__gpsCalls = 0;
  for (const method of ['getCurrentPosition', 'watchPosition']) navigator.geolocation[method] = () => { window.__gpsCalls++; throw Error('GPS forbidden in prototype'); };
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const capture = async name => {
  const ruleIndex = await page.evaluate(() => {
    const sheet = [...document.styleSheets].find(candidate => candidate.href?.endsWith('/src/styles.css'));
    if (!sheet) throw new Error('Application stylesheet not found for screenshot layout');
    const index = sheet.cssRules.length;
    sheet.insertRule('.bottom-nav{position:static!important;transform:none!important;margin:14px auto 12px!important}', index);
    return index;
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: new URL(`../screenshots/dogs/${name}.png`, import.meta.url).pathname, fullPage: true });
  await page.evaluate(index => {
    const sheet = [...document.styleSheets].find(candidate => candidate.href?.endsWith('/src/styles.css'));
    sheet.deleteRule(index);
  }, ruleIndex);
};
await mkdir(new URL('../screenshots/dogs/', import.meta.url), { recursive: true });

await page.goto(`${base}/`);
assert.equal(new URL(page.url()).pathname, '/auth');
await page.getByRole('link', { name: 'Se connecter', exact: true }).click();
await page.getByLabel('Email', { exact: true }).fill('demo@example.test');
await page.getByLabel('Mot de passe', { exact: true }).fill('fictif123');
await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
await page.locator('#feedback').evaluate(node => node.classList.remove('visible'));
const authStorage = await page.evaluate(() => JSON.stringify({ ...localStorage }));

await page.locator('.bottom-nav a[href="/dogs"]').click();
assert.equal(new URL(page.url()).pathname, '/dogs');
assert.equal(await page.locator('.bottom-nav [aria-current="page"]').getAttribute('href'), '/dogs');
assert.equal(await page.locator('.dog-list-card').count(), 3);
assert.match(await page.locator('main').innerText(), /Nox/);
await capture('dogs-list-iphone');

await page.locator('.dog-list-card[href="/dogs/nox"]').click();
assert.equal(new URL(page.url()).pathname, '/dogs/nox');
assert.match(await page.locator('main').innerText(), /Sous les pins/);
assert.match(await page.locator('main').innerText(), /Science & santé/);
await capture('dogs-profile-iphone');

await page.getByRole('link', { name: 'Modifier le profil', exact: true }).click();
assert.equal(new URL(page.url()).pathname, '/dogs/nox/edit');
const photoInput=page.locator('[data-dog-photo]');
const photoBuffer=await readFile(new URL('../src/assets/hero-malinois-mountain.png',import.meta.url));
const replacementBuffer=await readFile(new URL('../src/assets/coaching-mode-normal.jpg',import.meta.url));
const finalPhotoBuffer=await readFile(new URL('../src/assets/auth-piste-community-3dogs.png',import.meta.url));
const asPhotoDataUrl=(buffer,mime='image/png')=>`data:${mime};base64,${buffer.toString('base64')}`;
await photoInput.setInputFiles({name:'nox-original.png',mimeType:'image/png',buffer:photoBuffer});
await page.waitForFunction(expected => document.querySelector('[data-dog-photo-preview] img')?.src===expected,asPhotoDataUrl(photoBuffer));
assert.equal(await page.locator('[data-dog-photo-preview] img').getAttribute('alt'),'Photo de Nox');
await capture('dogs-photo-edit-iphone');
await photoInput.setInputFiles({name:'nox-remplacement.jpg',mimeType:'image/jpeg',buffer:replacementBuffer});
await page.waitForFunction(expected => document.querySelector('[data-dog-photo-preview] img')?.src===expected,asPhotoDataUrl(replacementBuffer,'image/jpeg'));
await page.locator('[data-dog-photo-reset]').click();
assert.match(await page.locator('[data-dog-photo-preview] img').getAttribute('src'),/hero-malinois-mountain\.png/);
await photoInput.setInputFiles({name:'nox-final.png',mimeType:'image/png',buffer:photoBuffer});
await page.waitForFunction(expected => document.querySelector('[data-dog-photo-preview] img')?.src===expected,asPhotoDataUrl(photoBuffer));
await capture('dogs-edit-iphone');
await page.locator('[name="officialName"]').fill('Nox du Val');
await page.locator('[name="notes"]').fill('Calme et concentré sur les pistes boisées.');
await page.locator('[name="disciplines"][value="search"]').check();
await page.locator('[name="status"]').selectOption('retired');
assert.equal(await page.locator('[data-dog-retirement-field]').isVisible(),true);
await page.locator('[name="retirementDate"]').fill('2025-04-12');
await page.locator('[name="specialty"]').fill('Pistage démonstration');
await page.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click();
assert.match(await page.locator('.dog-profile-identity').innerText(), /Pistage démonstration/i);
assert.match(await page.locator('.dog-profile-identity').innerText(), /Nox du Val/);
assert.match(await page.locator('.dog-notes').innerText(), /Calme et concentré/);
assert.match(await page.locator('.dog-profile-identity').innerText(), /2025-04-12/);
assert.equal(await page.locator('.dog-profile-hero img').getAttribute('src'),asPhotoDataUrl(photoBuffer));
assert.equal(await page.locator('.dog-profile-hero img').evaluate(image => getComputedStyle(image).objectFit),'cover');
assert.ok(await page.locator('.dog-profile-hero img').evaluate(image => image.getBoundingClientRect().width>0&&image.getBoundingClientRect().height>0));
assert.match(await page.locator('.dog-disciplines').innerText(),/Recherche/);
await capture('dogs-photo-profile-iphone');
await capture('dogs-disciplines-notes-iphone');

await page.locator('.bottom-nav a[href="/dogs"]').click();
await page.locator('.dog-list-card[href="/dogs/arko"]').click();
await page.getByRole('link', { name: 'Modifier le profil', exact: true }).click();
await page.locator('[name="status"]').selectOption('archived');
await page.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click();
assert.match(await page.locator('.dog-profile-status').innerText(), /Archivé/);

await page.locator('.bottom-nav a[href="/dogs"]').click();
await page.getByRole('link', { name: 'Ajouter un chien', exact: true }).click();
await page.locator('[data-dog-photo]').setInputFiles({name:'roxy.png',mimeType:'image/png',buffer:finalPhotoBuffer});
await page.waitForFunction(expected => document.querySelector('[data-dog-photo-preview] img')?.src===expected,asPhotoDataUrl(finalPhotoBuffer));
await capture('dogs-add-photo-iphone');
await page.locator('[name="name"]').fill('Roxy Démo');
await page.locator('[name="breed"]').fill('Berger fictif');
await page.locator('[name="officialName"]').fill('Roxy des Pins');
await page.locator('[name="notes"]').fill('Curieuse sur le terrain.');
await page.locator('[name="status"]').selectOption('retired');
await page.locator('[name="retirementDate"]').fill('2024-06-30');
await page.locator('[name="disciplines"][value="tracking"]').check();
await page.locator('[name="disciplines"][value="defense"]').check();
await page.getByRole('button', { name: 'Ajouter le chien', exact: true }).click();
assert.match(await page.locator('.dog-profile-identity').innerText(), /Roxy Démo/);
assert.match(await page.locator('.dog-profile-identity').innerText(), /Roxy des Pins/);
assert.match(await page.locator('.dog-notes').innerText(), /Curieuse sur le terrain/);
assert.equal(await page.locator('.dog-profile-hero img').getAttribute('src'),asPhotoDataUrl(finalPhotoBuffer));
assert.match(await page.locator('.dog-disciplines').innerText(),/Défense/);
assert.match(await page.locator('.dog-disciplines').innerText(),/Piste/);
assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), authStorage, 'dog changes do not write browser storage');

await page.locator('.back-link[href="/dogs"]').click();
assert.equal(await page.locator('.dog-list-card').count(), 4);
assert.match(await page.locator('main').innerText(), /Roxy Démo/);
assert.equal(await page.locator('.dog-list-card[href^="/dogs/dog-"] img').getAttribute('src'),asPhotoDataUrl(finalPhotoBuffer));
assert.equal(await page.locator('.dog-list-card[href^="/dogs/dog-"] img').evaluate(image => getComputedStyle(image).objectFit),'cover');
await page.reload();
assert.equal(await page.locator('.dog-list-card').count(), 3, 'mock dog changes reset after reload');
assert.doesNotMatch(await page.locator('main').innerText(), /Roxy Démo|Pistage démonstration/);
assert.equal(await page.evaluate(() => window.__gpsCalls), 0);

for (const width of [320, 375, 390, 430]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${base}/dogs`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `list overflow at ${width}`);
  await page.goto(`${base}/dogs/nox`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `profile overflow at ${width}`);
  await page.goto(`${base}/dogs/new`);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `form overflow at ${width}`);
  const layout = await page.evaluate(() => ({
    actionBottom: document.querySelector('.dog-form-actions').getBoundingClientRect().bottom,
    navTop: document.querySelector('.bottom-nav').getBoundingClientRect().top
  }));
  assert.ok(layout.actionBottom <= layout.navTop + 1, `form actions are above bottom navigation at ${width}: ${JSON.stringify(layout)}`);
}

await page.locator('.bottom-nav a[href="/profile"]').click();
await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
await page.goto(`${base}/dogs/nox`);
assert.equal(new URL(page.url()).pathname, '/auth', 'dog profile routes retain the existing mock auth gate');
assert.deepEqual(errors, []);
assert.deepEqual(external, []);
assert.deepEqual(apiCalls, []);
await browser.close();
console.log(JSON.stringify({ passed: true, widths: [320, 375, 390, 430], captures: ['dogs-list-iphone.png', 'dogs-photo-edit-iphone.png', 'dogs-edit-iphone.png', 'dogs-photo-profile-iphone.png', 'dogs-disciplines-notes-iphone.png', 'dogs-add-photo-iphone.png'], errors, external, apiCalls, gpsCalls: 0 }, null, 2));
