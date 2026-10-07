// Reusable track metadata lives only in this page's memory. No real route is drawn.
// Normalized reference departure in drawing units; no GPX parsing or real coordinates.
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
 return value.map((point,index)=>{
  const x=Number(point.x),y=Number(point.y);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>360||y<0||y>300)throw Error('Coordonnée de tracé invalide.');
  const breakBefore=index>0&&Boolean(point.breakBefore);
  return {id:String(point.id||`saved-point-${index+1}`),x,y,kind:index===0?'start':point.kind==='arrival'&&index===value.length-1?'arrival':'via',breakBefore,incomingMode:index===0||breakBefore?null:['free','follow'].includes(point.incomingMode)?point.incomingMode:'free'};
 });
};
const optionalText=(value,max=240)=>String(value??'').trim().slice(0,max);
export function createTrackLibrary() {
 let items=seed.map(copy),nextId=1;
 const list=()=>items.map(copy);
 const find=id=>{const item=items.find(t=>t.id===id);if(!item)throw Error('Ce tracé n’est plus disponible.');return item;};
 const get=id=>copy(find(id));
 const insert=item=>{const saved={...item,id:`track-local-${nextId++}`,ownerId:'self'};items=[...items,saved];return copy(saved);};
 return {
  list,
  get,
  create(name) {const item={id:`track-local-${nextId++}`,name:validName(name),source:'draw',ownerId:'self',start:mockStart(),description:'Votre tracé mock'};items=[...items,item];return copy(item);},
  createPrepared({name,description='',category='',difficulty='',dogId='',notes='',source='draw',provenance='manual',geometry,copiedFrom}={}) {
   if(!['draw','gpx'].includes(source))throw Error('Provenance source inconnue.');
   const points=validPoints(geometry?.points);
   return insert({name:validName(name),source,provenance,...(copiedFrom?{copiedFrom:copy(copiedFrom)}:{}),description:optionalText(description),category:optionalText(category,80),difficulty:optionalText(difficulty,80),dogId:optionalText(dogId,80),notes:optionalText(notes,1000),geometry:{points},start:{x:points[0].x,y:points[0].y,space:'mock-map'}});
  },
  updatePrepared(id,patch={}) {
   const current=find(id);
   if(['pose','search','reference'].includes(current.source))throw Error('Une trace de session est en lecture seule.');
   const next={...current};
   for(const key of ['name','description','category','difficulty','dogId','notes'])if(Object.hasOwn(patch,key))next[key]=key==='name'?validName(patch[key]):optionalText(patch[key],key==='notes'?1000:key==='description'?240:80);
   if(Object.hasOwn(patch,'geometry'))next.geometry={points:validPoints(patch.geometry?.points)};
   if(next.geometry?.points?.length)next.start={x:next.geometry.points[0].x,y:next.geometry.points[0].y,space:'mock-map'};
   items=items.map(item=>item.id===id?next:item);return copy(next);
  },
  duplicatePrepared(id,{name}={}) {
   const current=find(id);if(!current.geometry?.points?.length)throw Error('Aucune géométrie disponible à copier.');
   const {id:sourceId,ownerId,...fields}=copy(current);
   return insert({...fields,name:validName(name||`${current.name} · copie`),source:'draw',provenance:'copy',copiedFrom:{id:sourceId,kind:'prepared'},geometry:{points:validPoints(current.geometry.points)}});
  },
  createCopy({name,sourceId,sourceKind,points,description='',category='',difficulty='',dogId='',notes=''}={}) {
   if(!sourceId||!['pose','search','reference'].includes(sourceKind))throw Error('Source de copie invalide.');
   return this.createPrepared({name,description,category,difficulty,dogId,notes,source:'draw',provenance:'copy',geometry:{points:validPoints(points)},copiedFrom:{id:String(sourceId),kind:sourceKind}});
  },
  importFixture(id,name) {const file=gpxFixtures.find(f=>f.id===id);if(!file)throw Error('Choisissez un fichier de démonstration.');const item={...file,id:`track-local-${nextId++}`,name:validName(name || file.name),ownerId:'self',description:'GPX de démonstration',provenance:'gpx-mock'};items=[...items,item];return copy(item);},
  rename(id,name) {const item=find(id);items=items.map(t=>t.id===id?{...item,name:validName(name)}:t);return get(id);},
  remove(id) {find(id);items=items.filter(t=>t.id!==id);}
 };
}
