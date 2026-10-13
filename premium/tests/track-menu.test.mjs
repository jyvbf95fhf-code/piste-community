import {test} from 'node:test';import assert from 'node:assert/strict';
import {GeographicTrackCockpit} from '../src/track-editor-cockpit.mjs';import {createTrackDraft} from '../src/track-editor.mjs';
test('creator menu provides an icon shortcut and organized sections without changing dock actions',()=>{
 const h=GeographicTrackCockpit({draft:createTrackDraft({geographic:true})});
 assert.match(h,/aria-label="Ouvrir le menu du tracé"/);assert.doesNotMatch(h,/Nom et enregistrement ▴/);
 for(const label of ['Mon tracé','Importer un GPX','Points et édition','Mes pistes'])assert.ok(h.includes(label));
 assert.match(h,/data-editor-action="close-menu"/);assert.match(h,/data-track-editor-form/);assert.match(h,/href="\/tracks"/);
 assert.match(h,/Importer un GPX[\s\S]*?Bientôt/);
 for(const id of ['remove-last-segment','toggle-route','remove-point'])assert.ok(h.includes(`data-editor-action="${id}"`));
});
test('close-menu command collapses the sheet and returns focus to its shortcut',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');const source=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8'),start=source.indexOf(" if(editorAction&&location.pathname==='/track-builder')"),end=source.indexOf(' const place=',start);let focused=false;const panel={open:true,querySelector:()=>({focus:()=>focused=true})};
 runInNewContext(`(()=>{${source.slice(start,end)}})()`,{editorAction:{dataset:{editorAction:'close-menu'}},location:{pathname:'/track-builder'},document:{querySelector:()=>panel}});
 assert.equal(panel.open,false);assert.equal(focused,true);
});
