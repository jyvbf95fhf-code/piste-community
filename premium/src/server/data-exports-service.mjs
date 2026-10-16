import {buildAccountAnalysisSources,buildAccountScientificDataset} from '../account-analysis-sources.mjs';
import {buildJumolfSources} from '../jumolf-adapter.mjs';
import {applyJumolfSourceConsents} from '../jumolf-consent.mjs';
import {projectRemoteSession} from './coaching-service.mjs';
import {createPersonalDataRepository} from './personal-data-repository.mjs';
import {serializeDataExport} from '../data-exports.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const serialize=input=>{try{return serializeDataExport(input);}catch(error){fail(error.message);}};
export async function exportAccountData({admin,uid,capabilities,body,clock=Date.now}){
 if(!uid)fail('Connexion requise.',401);
 const {domain,format}=body;
 if(!['coaching','ops','science','jumolf','track','backup'].includes(domain)||!['json','csv','gpx'].includes(format)||domain==='backup'&&format!=='json')fail('Format d’export invalide.');
 if(domain==='science'&&!capabilities.permissions?.research||domain==='jumolf'&&!['premium','admin_grant','access_code'].includes(capabilities.jumolf_entitlement?.entitlement))fail('Accès à cet export refusé.',403);
 if(body.ids!==undefined&&(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>100||body.ids.some(id=>typeof id!=='string'||id.length>120)))fail('Sélection d’export invalide.');
 const repository=createPersonalDataRepository(admin,uid),records=[];
 const kinds={backup:['profile','dog','track','ops','session-dog-link'],coaching:['dog','session-dog-link'],ops:['dog','ops'],track:['dog','track'],science:['dog','ops','session-dog-link'],jumolf:['dog','track','ops','session-dog-link']}[domain];
 for(const kind of kinds){
  let cursor=null;do{const page=await repository.list({kind,cursor});records.push(...page.records.filter(r=>!r.deletedAt));cursor=page.cursor;if(records.length>5000)fail('Export trop volumineux. Contactez le propriétaire.',413);}while(cursor);
 }
 const shared=[];let cursor=null;
 if(domain!=='ops'&&domain!=='track')do{
  let query=admin.from('coaching_remote_sessions').select('id,state').contains('state',{members:[{id:uid}]}).order('id',{ascending:true});if(cursor)query=query.gt('id',cursor);
  const result=await query.limit(51);if(result.error)fail('Lecture des sessions impossible.',503);const rows=result.data||[];
  for(const row of rows.slice(0,50))shared.push(projectRemoteSession(row.state,uid,clock()));cursor=rows.length>50?rows[49].id:null;if(shared.length>5000)fail('Trop de sessions pour cet export.',413);
 }while(cursor);
 if(domain==='backup'){
  const file=serialize({domain,format,records,now:new Date(clock()).toISOString()});const data=JSON.parse(file.content);data.coachingSessions=shared;file.content=JSON.stringify(data,null,2);if(new TextEncoder().encode(file.content).byteLength>10000000)fail('Sauvegarde trop volumineuse.',413);return file;
 }
 const byKind=kind=>records.filter(r=>r.kind===kind),dogs=byKind('dog').map(r=>({...r.payload,id:r.id,ownerId:uid}));
 const links=Object.fromEntries(byKind('session-dog-link').map(r=>[r.payload.sessionId,r.payload.dogId]));
 const raw=buildAccountAnalysisSources({ownerId:uid,sharedOwnerId:uid,tracksOwnerId:uid,dogs,sharedSessions:shared,dogIds:links,tracks:byKind('track').map(r=>({...r.payload,id:'track:'+r.id,ownerId:uid})),operationalMissions:byKind('ops').map(r=>({...r.payload,id:r.id,ownerUserId:uid}))});
 let sources=buildJumolfSources(raw);if(domain==='jumolf')sources=applyJumolfSourceConsents(sources,body.consents);
 let rows=domain==='coaching'?sources.sessions:domain==='ops'?sources.operational:domain==='track'?sources.tracks:domain==='science'?buildAccountScientificDataset(sources,uid).sessions:[...sources.sessions,...sources.operational,...sources.tracks];
 if(body.ids){const selected=new Set(body.ids);if([...selected].some(id=>!rows.some(r=>r.id===id)))fail('Dossier sélectionné inaccessible.',403);rows=rows.filter(r=>selected.has(r.id));}
 return serialize({domain,format,rows,now:new Date(clock()).toISOString()});
}
