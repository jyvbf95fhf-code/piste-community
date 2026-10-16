// Serializers consume only authorized, existing account projections.
const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const iso=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(typeof v==='number'?v:Date.parse(v))?new Date(v).toISOString():null;
const geographic=p=>p?.space==='wgs84'&&Number.isFinite(p.x)&&Math.abs(p.x)<=180&&Number.isFinite(p.y)&&Math.abs(p.y)<=90;
const cell=v=>{let s=v===null||v===undefined?'':String(v);if(/^[\s\u0000-\u001f]*[=+@-]/.test(s)&&typeof v!=='number')s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
export function serializeDataExport({domain,format,rows=[],records=null,now=new Date().toISOString()}){
 if(!['coaching','ops','science','jumolf','track','backup'].includes(domain)||!['json','csv','gpx'].includes(format)||domain==='backup'&&format!=='json')throw Error('Format d’export invalide.');
 let content,mime;
 if(format==='json'){mime='application/json';content=JSON.stringify({schemaVersion:1,domain,exportedAt:now,scope:'Données sauvegardées et autorisées uniquement',...(domain==='backup'?{records:records||[]}:{sessions:rows})},null,2);}
 if(format==='csv'){
  mime='text/csv;charset=utf-8';const columns=['id','kind','title','dog_id','dog_name','started_at','finished_at','distance_m','duration_s','track_age_s','trace_provenance','weather_provenance','temperature_c','humidity_pct','wind_speed_kmh','wind_direction_deg','corridor_provenance','events_count'];
  content='\uFEFF'+[columns.map(cell).join(';'),...rows.map(s=>[s.id,s.kind,s.title,s.dogId,s.dog?.name,s.startedAt,s.finishedAt,s.metrics?.distanceM,s.metrics?.durationSeconds,s.trackAge?.seconds,s.provenance?.trace,s.weather?.provenance,s.weather?.temperature,s.weather?.humidity,s.wind?.speed,s.wind?.direction,s.corridor?.provenance,s.events?.length].map(cell).join(';'))].join('\r\n');
 }
 if(format==='gpx'){
  const tracks=[];
  for(const row of rows)for(const [kind,points] of [['Recherche',row.trace],['Pose / référence',row.referenceTrace]]){
   const segments=[];let segment=[];
   for(const p of points||[]){if(!geographic(p)||p.breakBefore){if(segment.length)segments.push(segment);segment=[];}if(geographic(p))segment.push(p);}
   if(segment.length)segments.push(segment);if(!segments.length)continue;
   tracks.push(`<trk><name>${xml((row.title||row.id)+' · '+kind)}</name><desc>${xml(row.provenance?.[kind==='Recherche'?'trace':'referenceTrace']||'Provenance non disponible')}</desc>${segments.map(seg=>'<trkseg>'+seg.map(p=>`<trkpt lat="${p.y}" lon="${p.x}">${iso(p.timestamp)?'<time>'+iso(p.timestamp)+'</time>':''}</trkpt>`).join('')+'</trkseg>').join('')}</trk>`);
  }
  if(!tracks.length)throw Error('Aucun tracé GPS géographique disponible dans ces dossiers.');mime='application/gpx+xml';content=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="PISTE Community V2" xmlns="http://www.topografix.com/GPX/1/1">${tracks.join('')}</gpx>`;
 }
 if(new TextEncoder().encode(content).byteLength>10000000)throw Error('Export trop volumineux. Sélectionnez moins de dossiers.');
 return {filename:'piste-'+domain+'.'+format,mime,content};
}
