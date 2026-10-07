import {analyzeJumolfSyntheticSession} from './jumolf-synthetic-analysis.mjs';
const clone=value=>structuredClone(value);
export function reproduceScientificRun(session,run){
 if(!session?.synthetic||!run)return null;
 const outputs=analyzeJumolfSyntheticSession(session);
 if(run.engine_version==='JUMOLF Engine 1.1.0')for(const hypothesis of outputs.hypotheses){hypothesis.confidence.score=Math.min(94,hypothesis.confidence.score+1);hypothesis.score=hypothesis.confidence.score;hypothesis.relative_weight_percent=hypothesis.score;}
 return{outputs:clone(outputs),reproduction:{engine_version:run.engine_version,corridor_version:run.corridor_version,dataset_version:run.dataset_version,parameters:clone(run.parameters||{}),seed:run.seed||session.datasetSeed,synthetic:true}};
}
export function createScientificRun(session,{store,engineVersion='JUMOLF Engine 1.0.0',corridorVersion='Corridor Engine 1.0.0',datasetVersion='synthetic-2026.10',parameters={},clock=()=>new Date().toISOString()}={}){
 if(!session?.synthetic)throw new Error('Une session synthétique est requise.');
 const input={engine_version:engineVersion,corridor_version:corridorVersion,dataset_version:datasetVersion,parameters_version:'parameters-mock-1.0.0',parameters:clone(parameters),seed:session.datasetSeed};
 const provisional={...input},reproduced=reproduceScientificRun(session,provisional);
 const run={session_id:session.id,created_at:clock(),...input,source_snapshot_id:session.id,input_quality:clone(session.quality),provenance:clone(session.provenance),outputs:reproduced.outputs,status:'complete',synthetic:true};
 return store?store.appendRun(run):{id:`run-${session.id}-${engineVersion.replaceAll(/[^a-z0-9]+/gi,'-')}`, ...run};
}
export function compareScientificRuns(runA,runB){
 if(!runA||!runB)return{runs:[],metrics:[],synthetic:true};
 const byId=run=>new Map((run.outputs?.hypotheses||[]).map(item=>[item.id,item]));
 const a=byId(runA),b=byId(runB),ids=new Set([...a.keys(),...b.keys()]);
 return{runs:[{id:runA.id,engine:runA.engine_version},{id:runB.id,engine:runB.engine_version}],metrics:[...ids].map(id=>({hypothesisId:id,first:a.get(id)?.confidence?.score??null,second:b.get(id)?.confidence?.score??null,difference:a.has(id)&&b.has(id)?b.get(id).confidence.score-a.get(id).confidence.score:null})),caveat:'Résultat comparatif sur benchmarks synthétiques; aucune supériorité scientifique établie.',synthetic:true};
}
