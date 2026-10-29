import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import bundled from '@sparticuz/chromium';
import {GeographicTrackCockpit} from '../src/track-editor-cockpit.mjs';
import {createTrackDraft} from '../src/track-editor.mjs';
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=(await Promise.all([...index.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(m=>readFile(new URL('../'+m[1].replace(/^\//,''),import.meta.url),'utf8')))).join('\n');
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await bundled.executablePath(),args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 for(const previewing of [false,true])for(const width of [320,390,430])for(const wind of [{speed:7,from:281},{error:true},null]){
  await page.setViewportSize({width,height:844});
  await page.setContent(`<style>${css}</style><div class="app-shell">${GeographicTrackCockpit({draft:createTrackDraft({geographic:true}),smartState:{previewing,scentCorridorVisible:true,scentWind:wind}})}</div>`);
  const actions=previewing?await page.locator('.preview-map-actions').boundingBox():null,weather=await page.locator('.creator-wind-status').boundingBox(),footer=await page.locator('.creator-action-area').boundingBox();
  if(actions)assert.ok(actions.y+actions.height<=weather.y+1,`weather overlaps preview actions at ${width}px`);
  assert.ok(weather.y+weather.height<=footer.y+1,`weather overlaps footer at ${width}px`);
  if(width===390&&wind?.speed)await page.screenshot({path:previewing?'/tmp/piste-preview-layout.png':'/tmp/piste-editor-weather-layout.png'});
  if(actions)assert.ok(actions.y>=140,'preview leaves room for map heading');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 }
 console.log('PASS editor and preview layout: 320/390/430px, wind available/loading/unavailable, no overlaps');
}finally{await browser.close();}
