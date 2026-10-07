import { createScientificConsentStore } from './scientific-consent-store.mjs';
import { createStablePseudonymizer } from './scientific-pseudonymization.mjs';
import { projectSessionToScientificCorpus, projectOpsSessionToScientificCorpus } from './scientific-corpus-projection.mjs';
import { assessReidentificationRisk } from './scientific-reidentification.mjs';
import { buildScientificContributionCohort, compareScientificContributionCohorts } from './scientific-corpus-cohorts.mjs';

export const SCIENTIFIC_CONTRIBUTION_CORPUS_VERSION='synthetic-contributors-2026.10';
const clone=value=>structuredClone(value);
const getStore=(stores,key)=>stores instanceof Map?stores.get(key):stores?.[key];
const registryFor=fixtures=>({contributors:fixtures.contributors.map(row=>row.sourceKey),dogs:fixtures.dogs.map(row=>row.sourceKey),sessions:fixtures.sessions.map(row=>row.sourceKey)});

function createFixtureStores(fixtures) {
  const stores=new Map();
  for(const contributor of fixtures.contributors){
    const events=fixtures.consentEvents.filter(event=>event.mockUserId===contributor.mockUserId);
    const states=Object.fromEntries(fixtures.inclusionEvents.filter(event=>fixtures.sessions.find(session=>session.sourceKey===event.sessionKey)?.contributorKey===contributor.sourceKey).map(event=>[event.sessionKey,event.state]));
    stores.set(contributor.mockUserId,createScientificConsentStore({mockUserId:contributor.mockUserId,initialEvents:events,initialSessionStates:states}));
  }
  return stores;
}

function finalizeAggregateAtoms(provisional) {
  const grouped=new Map();
  for(const item of provisional){
    const key=[item.atom.category,item.atom.field,item.atom.sessionType].join('|');
    const group=grouped.get(key)||{category:item.atom.category,field:item.atom.field,sessionType:item.atom.sessionType,provenance:item.atom.provenance,synthetic:true,pseudonymized:false,contributingSessions:0,contributingDogs:new Set(),distribution:new Map()};
    group.contributingSessions+=1;group.contributingDogs.add(item.dogKey);group.distribution.set(item.atom.bucket,(group.distribution.get(item.atom.bucket)||0)+1);grouped.set(key,group);
  }
  const output=[];
  for(const group of grouped.values()){
    const risk=assessReidentificationRisk({sessionCount:group.contributingSessions,dogCount:group.contributingDogs.size,assessmentType:'cross_dog'});
    if(!risk.allowed)continue;
    output.push({category:group.category,field:group.field,sessionType:group.sessionType,provenance:group.provenance,distribution:[...group.distribution].map(([bucket,count])=>({bucket,count})),synthetic:true,pseudonymized:false,sessionCount:group.contributingSessions,dogCount:group.contributingDogs.size,label:'Agrégat synthétique'});
  }
  return output;
}

function opsAtomsFromProjectedRow(row,dogKey) {
  const atoms=[];
  for(const [name,field] of Object.entries(row.fields||{})){
    if(name==='trace')continue;
    const value=field.value;
    const push=(suffix,item)=>{
      if(item===undefined||item===null)return;
      const bucket=typeof item==='number'?`${Math.floor(item/10)*10}-${Math.floor(item/10)*10+10}`:String(item);
      atoms.push({atom:{category:field.consentCategory,field:`${name}.${suffix}`,bucket,provenance:field.provenance,quality:field.quality,synthetic:true,pseudonymized:false,sessionType:'operational'},dogKey});
    };
    if(name==='metrics')for(const [key,item] of Object.entries(value))push(key,item);
    else if(name==='weather')push('band',value.band);
    else if(name==='trackAgeBand')push('band',value);
    else if(name==='environment')push('broad_class',value);
    else if(name==='events')push('count_band',`${Math.floor(value.length/2)*2}-${Math.floor(value.length/2)*2+2}`);
  }
  return atoms;
}

export function buildScientificContributionCorpus({fixtures,consentStores,pseudonymizer}={}) {
  if(!fixtures?.contributors||!fixtures?.sessions)throw new TypeError('Fixtures de contribution scientifique requises.');
  const stores=createFixtureStores(fixtures);
  if(consentStores instanceof Map)for(const [key,store] of consentStores)stores.set(key,store);
  else if(consentStores&&typeof consentStores==='object')for(const [key,store] of Object.entries(consentStores))stores.set(key,store);
  const pseudonyms=pseudonymizer||createStablePseudonymizer({namespace:'scientific-corpus-v1',registry:registryFor(fixtures)});
  const contributorByKey=new Map(fixtures.contributors.map(item=>[item.sourceKey,item]));
  const inclusionBySession=new Map(fixtures.inclusionEvents.map(item=>[item.sessionKey,item.state]));
  const rows=[],provisionalAtoms=[];
  for(const session of fixtures.sessions){
    const contributor=contributorByKey.get(session.contributorKey);
    if(!contributor)continue;
    const store=getStore(stores,contributor.mockUserId);
    const consent=store?.snapshot();
    const inclusionState=inclusionBySession.get(session.sourceKey)||store?.sessionInclusionState(session.sourceKey)||'included';
    const project=session.type==='operational'?projectOpsSessionToScientificCorpus:projectSessionToScientificCorpus;
    const result=project({session,consent,inclusionState,pseudonymizer:pseudonyms});
    if(result.status==='individual'&&session.type==='operational')provisionalAtoms.push(...opsAtomsFromProjectedRow(result.row,session.dogKey));
    else if(result.status==='individual')rows.push(result.row);
    else if(result.status==='aggregate_only')for(const atom of result.aggregateAtoms||[])provisionalAtoms.push({atom,dogKey:session.dogKey});
  }
  const aggregateAtoms=finalizeAggregateAtoms(provisionalAtoms);
  const contributors=new Set(rows.map(row=>row.contributorId));
  const dogs=new Set(rows.map(row=>row.dogId).filter(Boolean));
  const categoryAvailability={};
  const allCategories=['training_session','gps_trace','weather','dog_metrics','field_events','longitudinal_history','reference_trace','jumolf_feedback','driver_annotations','tracking_metrics','pseudonymized_trace','non_sensitive_events','track_age','generic_environment'];
  for(const category of allCategories){
    let enabled=0;
    for(const contributor of fixtures.contributors){const consent=getStore(stores,contributor.mockUserId)?.snapshot();if(consent?.categories?.[category]||consent?.opsCategories?.[category])enabled++;}
    categoryAvailability[category]=enabled<5?{displayable:false,suppressionReason:'Échantillon insuffisant pour afficher ce résultat.',synthetic:true}:{displayable:true,consentingContributors:enabled,totalSyntheticContributors:fixtures.contributors.length,rate:fixtures.contributors.length?enabled/fixtures.contributors.length:0,synthetic:true};
  }
  const training=rows.length,operationalGroups=aggregateAtoms.filter(atom=>atom.sessionType==='operational'),operational=Math.max(0,...operationalGroups.map(atom=>atom.sessionCount));
  const contributorCount=contributors.size,dogCount=dogs.size,summaryDisplayable=training>=5&&dogCount>=3;
  const qualityCounts=rows.reduce((counts,row)=>(counts[row.quality]=(counts[row.quality]||0)+1,counts),{});
  for(const key of Object.keys(qualityCounts))if(qualityCounts[key]<5)qualityCounts[key]=null;
  return {
    version:fixtures.version||SCIENTIFIC_CONTRIBUTION_CORPUS_VERSION,synthetic:true,
    rows:clone(rows),aggregateAtoms:clone(aggregateAtoms),
    summary:{contributorCount:contributorCount>=5?contributorCount:null,dogCount:dogCount>=3?dogCount:null,sessionCount:summaryDisplayable?training+(operational>=5?operational:0):null,training:summaryDisplayable?training:null,operational:operational>=5?operational:null,operationalDisplayable:operational>=5,aggregateGroupCount:aggregateAtoms.length,qualityCounts,synthetic:true,label:'Données synthétiques / Démonstration'},
    categoryAvailability
  };
}

const matches=(row,filters)=>Object.entries(filters||{}).every(([key,value])=>{
  if(value===undefined||value===null||value==='')return true;
  if(key==='weatherBand')return row.fields.weather?.value?.band===value;
  if(key==='trackAgeBand')return row.fields.trackAgeBand?.value===value;
  if(key==='quality')return row.quality===value;
  if(key==='dogId')return row.dogId===value;
  if(key==='category')return Object.values(row.fields).some(item=>item.consentCategory===value);
  return row[key]===value;
});

export function filterScientificContributionCorpus(corpus,filters={}) {
  let rows=(corpus?.rows||[]).filter(row=>matches(row,filters));
  const allAtoms=(corpus?.aggregateAtoms||[]).filter(atom=>!filters.type||atom.sessionType===filters.type).filter(atom=>!filters.category||atom.category===filters.category);
  const opsAtoms=allAtoms.filter(atom=>atom.sessionType==='operational');
  if(filters.type==='operational')rows=[];
  const dogIds=new Set(rows.map(row=>row.dogId).filter(Boolean));
  const profile=Boolean(filters.dogId);
  const opsSessionCount=Math.max(0,...opsAtoms.map(atom=>atom.sessionCount)),opsDogCount=Math.max(0,...opsAtoms.map(atom=>atom.dogCount));
  const risk=filters.type==='operational'
    ? assessReidentificationRisk({sessionCount:opsSessionCount,dogCount:opsDogCount,opsRarity:opsSessionCount<5,assessmentType:'cross_dog'})
    : assessReidentificationRisk({sessionCount:rows.length,dogCount:dogIds.size,assessmentType:profile?'dog_profile':'cross_dog',criterionPrecision:filters.criterionPrecision||'coarse',environmentUniqueness:filters.environment==='rare-private-crossing'});
  if(!risk.allowed)return {displayable:false,rows:[],aggregateAtoms:[],summary:null,suppressionReason:risk.reason};
  const aggregateAtoms=allAtoms.filter(atom=>atom.sessionType==='training'||opsSessionCount>=5);
  return {displayable:true,rows:clone(rows),aggregateAtoms:clone(aggregateAtoms),summary:{sessionCount:filters.type==='operational'?opsSessionCount:rows.length+(opsSessionCount>=5?opsSessionCount:0),dogCount:filters.type==='operational'?opsDogCount:dogIds.size,training:filters.type==='operational'?0:rows.length,operational:opsSessionCount>=5?opsSessionCount:null,operationalDisplayable:opsSessionCount>=5,quality:rows.reduce((counts,row)=>(counts[row.quality]=(counts[row.quality]||0)+1,counts),{}),caveat:'Différence observée dans cet échantillon'},suppressionReason:null,coarsened:risk.action==='coarsen'};
}

export function createScientificContributionCorpusService(corpus) {
  if(!corpus?.synthetic)throw new TypeError('Corpus synthétique requis.');
  const summary=clone(corpus.summary);
  const categories=clone(corpus.categoryAvailability);
  return Object.freeze({
    summary:()=>clone(summary),
    categories:()=>clone(categories),
    view:filters=>filterScientificContributionCorpus(corpus,filters),
    cohort:criteria=>buildScientificContributionCohort(corpus,criteria),
    compare:(first,second)=>compareScientificContributionCohorts(first,second)
  });
}
