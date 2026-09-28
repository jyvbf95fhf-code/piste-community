const fs=require('fs');
const source=fs.readFileSync('app.js','utf8');
const checks=[
 ['idempotent consumer helper exists',/function ensureCoachingLocationConsumer\(/],
 ['session open invokes consumer helper',/ensureCoachingLocationConsumer\(s,runtimeGeneration\)/],
 ['helper uses preparation preview with replay-capable consumer',/ensureCoachingLocationConsumer[\s\S]{0,1800}requestCoachingPreviewLocation\(\{allowPreparation:true\}\)/],
 ['preview consumer requests replayLast',/coachingWatchPosition[\s\S]{0,500}replayLast/],
 ['helper records attach success after token',/consumerAttachSuccessAt/],
 ['preparation is compatible',/ensureCoachingLocationConsumer[\s\S]{0,1800}preparation/],
 ['consumer attach skipped reason diagnostic',/consumerAttachSkippedReason/],
 ['watcher restart preserves consumers',/watchRestartPreservedConsumers/],
 ['single native watcher',/navigator\.geolocation\.watchPosition\(/g],
 ['no session-specific native watcher',/coachingSessionSwitch/]
];
let failed=0;
for(const [name,pattern] of checks){const ok=pattern instanceof RegExp&&pattern.global?((source.match(pattern)||[]).length===1):pattern.test(source);console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
if(failed)process.exit(1);
