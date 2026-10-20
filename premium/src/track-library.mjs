import {normalizeTrainingMemory} from './jumolf-training-memory.mjs';
import {validatePersistenceRecord} from './persistence-contract.mjs';
import {normalizeTrackRoute} from './track-route-segments.mjs';
import {geographicCoordinates,trackDeparture} from './track-geographic.mjs';
// Prepared tracks use owner-scoped local persistence when storage is supplied.
// Legacy demonstration entries retain explicit drawing coordinates.
const mockStart=()=>({x:70,y:242,space:'mock-map'});
const copy=value=>structuredClone(value);
export const gpxFixtures=Object.freeze([
 Object.freeze({id:'gpx-pins',name:'Lisière des pins',fileName:'lisiere-des-pins.gpx',source:'gpx',ownerId:null,start:Object.freeze(mockStart())}),
 Object.freeze({id:'gpx-cretes',name:'Sentier des crêtes',fileName:'sentier-des-cretes.gpx',source:'gpx',ownerId:null,start:Object.freeze(mockStart())})
]);
const seed=[
 {id:'track-clairiere',name:'La clairière',source:'draw',ownerId:'alex',start:mockStart(),description:'Exercice fictif · forêt'},
 {id:'track-lisiere',name:'Lisière du matin',source:'draw',ownerId:'camille',start:mockStart(),description:'Exercice fictif · lisière'}
];
const validName=value=>{const name=String(value || '').trim();if(!name || name.length>80)throw Error('Choisissez un nom de 1 à 80 caractères.');return name;};
const validPoints=value=>{
 if(!Array.isArray(value)||value.length<2)throw Error('Un tracé modifiable doit contenir au moins deux points.');
 const geo=value.every(p=>p.space==='wgs84');if(!geo&&value.some(p=>p.space==='wgs84'))throw Error('Espaces de coordonnées incompatibles.');
 return value.map((point,index)=>{
  const x=Number(point.x),y=Number(point.y);
  if(!geo&&(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>360||y<0||y>300))throw Error('Coordonnée de tracé invalide.');
  const breakBefore=index>0&&Boolean(point.breakBefore);
  return {id:String(point.id||`saved-point-${index+1}`),...(geo?geographicCoordinates({x,y}):{x,y}),kind:index===0?'start':point.kind==='arrival'&&index===value.length-1?'arrival':'via',breakBefore,incomingMode:index===0||breakBefore?null:['free','follow'].includes(point.incomingMode)?point.incomingMode:'free',...(geo&&index>0&&!breakBefore&&point.incomingMode==='follow'?{route:normalizeTrackRoute(point.route,value[index-1],point)}:{})};
 });
};
const optionalText=(value,max=240)=>String(value??'').trim().slice(0,max);
export function createTrackLibrary({storage,ownerId=null}={}) {
 let items=seed.map(copy),nextId=1,warning='',blocked=false;
 const key=ownerId?`piste-v2-prepared-tracks:${encodeURIComponent(ownerId)}`:null;
 if(key&&storage){try{
  const raw=storage.getItem(key);
  if(raw){const snapshot=JSON.parse(raw);
   if(snapshot.version!==1||snapshot.ownerId!==ownerId||!Array.isArray(snapshot.items)||snapshot.items.length>1000)throw Error('Sauvegarde incompatible');
   const ids=new Set();const restored=snapshot.items.map(item=>{
    if(!item||item.ownerId!=='self'||!(/^(track-local-[1-9][0-9]*|track-cloud-[0-9a-f-]{36})$/.test(item.id))||item.id.startsWith('track-local-')&&!Number.isSafeInteger(Number(item.id.slice(12)))||ids.has(item.id)||!['draw','gpx'].includes(item.source))throw Error('Tracé invalide');
    ids.add(item.id);const normalized={id:item.id,ownerId:'self',source:item.source,name:validName(item.name),provenance:optionalText(item.provenance,80),description:optionalText(item.description),category:optionalText(item.category,80),difficulty:optionalText(item.difficulty,80),dogId:optionalText(item.dogId,80),notes:optionalText(item.notes,1000)};
    if(item.trainingMemory&&ownerId)try{normalized.trainingMemory=normalizeTrainingMemory(item.trainingMemory,{ownerId,dogId:normalized.dogId});}catch{warning='Préparation pédagogique incompatible : tracé conservé sans rattachement.';}
    if(item.fileName)normalized.fileName=optionalText(item.fileName,240);
    if(item.copiedFrom?.id&&['prepared','pose','search','reference'].includes(item.copiedFrom.kind))normalized.copiedFrom={id:optionalText(item.copiedFrom.id,240),kind:item.copiedFrom.kind};
    if(item.geometry){const points=validPoints(item.geometry.points);normalized.geometry={points};normalized.start=trackDeparture(points[0]);}
    else normalized.start=mockStart();
    return normalized;
   });
   items=[...items,...restored];nextId=1+Math.max(0,...restored.filter(item=>item.id.startsWith('track-local-')).map(item=>Number(item.id.slice(12))));
  }
 }catch{blocked=true;warning='Sauvegarde des tracés non restaurée. Les données existantes sont conservées sans être écrasées.';}}
 if(key&&!storage)warning='Sauvegarde locale indisponible dans ce navigateur.';
 const commit=next=>{
  if(key){if(blocked)throw Error(warning);if(!storage)throw Error('Tracé non enregistré : sauvegarde locale indisponible.');
   try{storage.setItem(key,JSON.stringify({version:1,ownerId,items:next.filter(item=>item.ownerId==='self')}));warning='';}
   catch{warning='Tracé non enregistré : sauvegarde locale impossible (stockage plein ou bloqué).';throw Error(warning);}
  }
  items=next;
 };
 const list=()=>items.map(copy);
 const find=id=>{const item=items.find(t=>t.id===id);if(!item)throw Error('Ce tracé n’est plus disponible.');return item;};
 const get=id=>copy(find(id));
 const insert=item=>{const saved={...item,id:`track-local-${nextId}`,ownerId:'self'};commit([...items,saved]);nextId++;return copy(saved);};
 return {
  list,
  get,
  persistenceWarning:()=>warning,
  restoreCloud(record,localId='track-cloud-'+record.id){
   const r=validatePersistenceRecord(record);if(r.kind!=='track'||r.deletedAt)throw Error('Tracé distant indisponible.');const normalized=createTrackLibrary().createPrepared(r.payload);const previous=items.find(item=>item.id===localId),retained=previous?.trainingMemory&&previous.dogId===normalized.dogId&&JSON.stringify(previous.geometry)===JSON.stringify(normalized.geometry)?{trainingMemory:previous.trainingMemory}:{};const restored={...normalized,...retained,id:localId,ownerId:'self'};commit([...items.filter(item=>item.id!==localId),restored]);return copy(restored);
  },
  create(name) {return insert({name:validName(name),source:'draw',start:mockStart(),description:'Votre tracé mock'});},
  createPrepared({name,description='',category='',difficulty='',dogId='',notes='',source='draw',provenance='manual',fileName,geometry,copiedFrom,trainingMemory}={}) {
   if(!['draw','gpx'].includes(source))throw Error('Provenance source inconnue.');
   const points=validPoints(geometry?.points);
   return insert({name:validName(name),source,provenance,...(source==='gpx'&&fileName?{fileName:optionalText(fileName,240)}:{}),...(copiedFrom?{copiedFrom:copy(copiedFrom)}:{}),description:optionalText(description),category:optionalText(category,80),difficulty:optionalText(difficulty,80),dogId:optionalText(dogId,80),notes:optionalText(notes,1000),...(trainingMemory?{trainingMemory:normalizeTrainingMemory(trainingMemory,{ownerId:ownerId||trainingMemory.ownerId,dogId})}:{}),geometry:{points},start:trackDeparture(points[0])});
  },
  updatePrepared(id,patch={}) {
   const current=find(id);
   if(['pose','search','reference'].includes(current.source))throw Error('Une trace de session est en lecture seule.');
   const next={...current};
   for(const key of ['name','description','category','difficulty','dogId','notes'])if(Object.hasOwn(patch,key))next[key]=key==='name'?validName(patch[key]):optionalText(patch[key],key==='notes'?1000:key==='description'?240:80);
   if(Object.hasOwn(patch,'dogId')&&patch.dogId!==current.dogId||Object.hasOwn(patch,'geometry')&&JSON.stringify(patch.geometry)!==JSON.stringify(current.geometry))delete next.trainingMemory;
   if(patch.trainingMemory)next.trainingMemory=normalizeTrainingMemory(patch.trainingMemory,{ownerId:ownerId||patch.trainingMemory.ownerId,dogId:next.dogId});
   if(Object.hasOwn(patch,'geometry'))next.geometry={points:validPoints(patch.geometry?.points)};
   if(next.geometry?.points?.length)next.start=trackDeparture(next.geometry.points[0]);
   commit(items.map(item=>item.id===id?next:item));return copy(next);
  },
  duplicatePrepared(id,{name}={}) {
   const current=find(id);if(!current.geometry?.points?.length)throw Error('Aucune géométrie disponible à copier.');
   const {id:sourceId,ownerId,trainingMemory,...fields}=copy(current);
   return insert({...fields,name:validName(name||`${current.name} · copie`),source:'draw',provenance:'copy',copiedFrom:{id:sourceId,kind:'prepared'},geometry:{points:validPoints(current.geometry.points)}});
  },
  createCopy({name,sourceId,sourceKind,points,description='',category='',difficulty='',dogId='',notes=''}={}) {
   if(!sourceId||!['pose','search','reference'].includes(sourceKind))throw Error('Source de copie invalide.');
   return this.createPrepared({name,description,category,difficulty,dogId,notes,source:'draw',provenance:'copy',geometry:{points:validPoints(points)},copiedFrom:{id:String(sourceId),kind:sourceKind}});
  },
  importFixture(id,name) {const file=gpxFixtures.find(f=>f.id===id);if(!file)throw Error('Choisissez un fichier de démonstration.');return insert({...file,name:validName(name || file.name),description:'GPX de démonstration',provenance:'gpx-mock'});},
  rename(id,name) {const item=find(id);commit(items.map(t=>t.id===id?{...item,name:validName(name)}:t));return get(id);},
  remove(id) {find(id);commit(items.filter(t=>t.id!==id));}
 };
}

export const gpxReferenceChoices=items=>[...items.filter(t=>t.source==='gpx'),...gpxFixtures.filter(t=>!items.some(i=>i.id===t.id))];
