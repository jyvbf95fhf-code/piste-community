import {createGpsPose,startGpsPose,appendGpsFix,gapGpsPose,finishGpsPose} from '../src/coaching-gps-model.mjs';
import {GpsPoseReport,mountGpsMaps} from '../src/coaching-gps-screen.mjs';
let p=startGpsPose(createGpsPose('fixture-map','fixture-actor'),1000);
for(const [timestamp,latitude,longitude] of [[1000,48.29427,7.38745],[2000,48.29437,7.38755],[3000,48.29447,7.38765]])p=appendGpsFix(p,{timestamp,coords:{latitude,longitude,accuracy:5}},timestamp);
p=gapGpsPose(p);p=appendGpsFix(p,{timestamp:4000,coords:{latitude:48.2946,longitude:7.3878,accuracy:5}},4000);p=finishGpsPose(p,5000);
document.querySelector('#gps-fixture').innerHTML=GpsPoseReport(p);mountGpsMaps();
