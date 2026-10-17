import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AuthScreen} from '../src/screens.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url));

test('the two validated SVGs are included byte for byte, without another drawing',async()=>{
 for(const [name,hash] of [['horizontal','082bfb6a742742e231ef01ca4b7ac0de8f647bd8ce62fe15ddf5c37667d3b1a3'],['complet','70ae689ababdba5f027b8ec0eb681e6e76b5f6045714c890c63fd333f2fbff0d']]){
  const bytes=await read(`src/assets/brand/piste-community-${name}.svg`);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
  assert.doesNotMatch(bytes.toString(),/<image\b|<script\b|<filter\b|<text\b/);
 }
});
test('manifest and iPhone/favicon links use local files at their stated dimensions',async()=>{
 const manifest=JSON.parse(await read('src/manifest.webmanifest'));assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
 for(const size of [32,64,180,192,512,1024]){
  const png=await read(`src/assets/brand/icons/icon-${size}.png`);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 for(const icon of manifest.icons){assert.match(icon.src,/^\/src\/assets\/brand\/icons\/icon-(192|512)\.png$/);assert.equal(icon.purpose,'any');}
 const html=(await read('index.html')).toString();assert.match(html,/rel="apple-touch-icon" sizes="180x180"/);assert.match(html,/rel="manifest" href="\/src\/manifest.webmanifest"/);
});
test('the complete logo is confined to the login header, without changing other account screens',()=>{
 const login=AuthScreen('/auth/login');assert.equal((login.match(/official-login-logo/g)||[]).length,1);assert.match(login,/<form data-auth="login" novalidate>/);assert.match(login,/type="submit"/);
 for(const route of ['/auth','/auth/signup','/auth/forgot'])assert.doesNotMatch(AuthScreen(route),/official-login-logo/);
});
test('both deployment configs disable automatic deployment for this V2 branch',async()=>{
 for(const url of [new URL('../vercel.json',import.meta.url),new URL('../../vercel.json',import.meta.url)]){
  const config=JSON.parse(await readFile(url));assert.equal(config.git.deploymentEnabled['feature/v2-premium-official-brand'],false);
 }
});
