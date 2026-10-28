import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrackDraft} from '../src/track-editor.mjs';
import {TrackEditorScreen} from '../src/track-editor-screen.mjs';

test('geographic creator dock labels explain each icon and reflect the active route mode',()=>{
 for(const [activeMode,routeLabel] of [['free','Tracé libre'],['follow','Routes / chemins']]){
  const html=TrackEditorScreen({draft:{...createTrackDraft({geographic:true}),activeMode}});
  const dock=html.match(/<nav class="creator-dock"[\s\S]*?<\/nav>/)[0];
  assert.deepEqual([...dock.matchAll(/<span>(.*?)<\/span>/g)].map(match=>match[1]),['Enregistrer','Fin de piste','Annuler',routeLabel,'Supprimer']);
  assert.match(dock,/aria-label="Annuler : retirer le dernier segment"/);
  assert.match(dock,new RegExp(`data-editor-action="toggle-route" aria-pressed="${activeMode==='follow'}"`));
  assert.match(html,/<aside class="creator-map-controls"[\s\S]*?data-editor-action="locate"[\s\S]*?data-editor-action="recenter"/);
 }
});
