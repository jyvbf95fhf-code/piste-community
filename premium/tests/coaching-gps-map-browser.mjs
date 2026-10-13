import {DriverGpsScreen} from '../src/coaching-driver-gps-screen.mjs';
import {SessionExitMenu} from '../src/coaching-session-exit-screen.mjs';
import {createGpsPose,startGpsPose,appendGpsFix,gapGpsPose,finishGpsPose} from '../src/coaching-gps-model.mjs';
import {GpsPoseReport,TracerGpsScreen,mountGpsMaps} from '../src/coaching-gps-screen.mjs';
let p=startGpsPose(createGpsPose('fixture-map','fixture-actor'),1000);
for(const [timestamp,latitude,longitude] of [[1000,48.29427,7.38745],[2000,48.29437,7.38755],[3000,48.29447,7.38765]])p=appendGpsFix(p,{timestamp,coords:{latitude,longitude,accuracy:5}},timestamp);
p=gapGpsPose(p);p=appendGpsFix(p,{timestamp:4000,coords:{latitude:48.2946,longitude:7.3878,accuracy:5}},4000);p=finishGpsPose(p,5000);
const kind=new URL(location.href).searchParams.get('cockpit');
if(kind==='layout'){
 document.body.innerHTML='<h1>Contrôle visuel · cadres 390 × 700</h1><p>Données fictives · aucun capteur ni sauvegarde.</p><iframe title="Conducteur" src="?cockpit=driver" width="390" height="700"></iframe><iframe title="Traceur" src="?cockpit=tracer" width="390" height="700"></iframe>';
}else if(kind==='driver'||kind==='tracer'){
 const status={running:true,status:'fresh',lastFix:p.segments.at(-1).at(-1)};
 let screen=kind==='driver'?DriverGpsScreen({phase:'SEARCH_RUNNING',searchTrackingState:'active',gpsSearch:p,searchPauseIntervals:[],search_started_at:new Date().toISOString()},status):TracerGpsScreen({phase:'active',gpsPose:p},status);
 screen=screen.replace('</header>',SessionExitMenu({canInterrupt:true})+'</header>');
 document.body.innerHTML=`<div class="app-shell" data-module-theme="coaching"><header class="screen-header">En-tête masqué</header><main>${screen}</main><nav class="bottom-nav">Navigation masquée</nav></div>`;
 mountGpsMaps();
}else{document.querySelector('#gps-fixture').innerHTML=GpsPoseReport(p);mountGpsMaps();}
