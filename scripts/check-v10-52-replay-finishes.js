'use strict';
const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
assert(/data-rate="5"/.test(app),'Vitesse 5x manquante');
assert(/setPlaybackRate\(Number\(rate\.dataset\.rate\)\)/.test(app),'Les boutons doivent appeler setPlaybackRate');
assert(/openReplayShortcut/.test(app),'Raccourci Replay manquant');
assert(/coachingDebriefReplay/.test(app),'Raccourci Replay du débrief manquant');
assert(/replayFit|fitTrack\(mapId,all/.test(app),'Cadrage global Replay manquant');
assert(/En cours de développement/.test(app),'État Satellite 3D reporté manquant');
async function speedTest(){
  const {createReplayPlayer}=await import('../replay-player.mjs');
  let frame=null;globalThis.requestAnimationFrame=callback=>{frame=callback;return 1};globalThis.cancelAnimationFrame=()=>{};
  const dataset={tracks:{traceur:[{timestamp:0,lat:1,lon:1},{timestamp:10000,lat:1.1,lon:1.1}]},capabilities:{startTimestamp:0,endTimestamp:10000,durationMs:10000,replayAvailable:true}};
  const player=createReplayPlayer(dataset);player.play();frame(0);frame(100);assert.equal(player.currentTime,100,'1x doit avancer de 100 ms');player.setPlaybackRate(5);frame(200);frame(300);assert.equal(player.currentTime,600,'5x doit avancer cinq fois plus vite');player.setPlaybackRate(2);frame(400);frame(500);assert.equal(player.currentTime,800,'2x doit rester effectif après changement');player.destroy();
}
speedTest().then(()=>console.log('check-v10-52-replay-finishes: PASS')).catch(error=>{console.error(error);process.exitCode=1});
