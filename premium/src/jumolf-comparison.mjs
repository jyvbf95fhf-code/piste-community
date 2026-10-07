const value=(session,key)=>session?.metrics?.[key]?.value??session?.metrics?.[key]??null;
const present=value=>value!==null&&value!==undefined&&value!=='';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const context=session=>({dogId:session.dogId||session.dog?.id||null,type:session.kind||session.type||null,terrain:session.terrain||null,age:session.trackAge?.seconds??session.trackAge?.label??null,weather:session.weather||null,wind:session.wind||null,handler:session.handlerId||session.handler?.id||session.handler?.name||null});
const labels={dogId:'chien',type:'type de session',terrain:'terrain',age:'délai de piste',weather:'météo',wind:'vent',handler:'conducteur'};
const metricKeys=['distance_to_reference_m','average_lateral_offset_m','max_lateral_offset_m','time_in_corridor_s','time_outside_corridor_s','ruptures','resumptions','resumption_delay_s','traveled_distance_m','reference_ratio','speed_m_s','investigation_zones','track_age'];

export function compareJumolfSessions(sessions=[]){
 const valid=(sessions||[]).filter(item=>item?.id);
 if(valid.length<2)throw new Error('Sélectionnez au moins deux sessions pour les comparer.');
 const contexts=valid.map(context),reasons=[];
 for(const key of Object.keys(labels)){
  const values=contexts.map(item=>item[key]);
  if(values.some(value=>!present(value)))reasons.push(`${labels[key]} indisponible sur au moins une session.`);
  else if(!values.every(value=>same(value,values[0])))reasons.push(`${labels[key]} différent entre les sessions.`);
 }
 const dogIds=contexts.map(item=>item.dogId),types=contexts.map(item=>item.type);
 const hardMismatch=dogIds.some(id=>!present(id))||!dogIds.every(id=>id===dogIds[0])||types.some(type=>!present(type))||!types.every(type=>type===types[0]);
 const contextCount=Object.values(contexts[0]).filter(present).length;
 const status=hardMismatch||contextCount<2?'poorly_comparable':reasons.length?'partially_comparable':'comparable';
 const comparison={};
 for(const key of metricKeys){const rows=valid.map(session=>({sessionId:session.id,value:value(session,key)}));comparison[key]=rows;}
 return {status,status_label:status==='comparable'?'Comparable':status==='partially_comparable'?'Partiellement comparable':'Peu comparable',reasons,sessions:valid.map(session=>({id:session.id,title:session.title||session.name||'Session',dog:session.dog?{id:session.dog.id||null,name:session.dog.name||null}:null,terrain:session.terrain||null,trackAge:session.trackAge||null,weather:session.weather||null,wind:session.wind||null,input_quality:session.input_quality||null})),comparison,limitations:['La comparabilité ne démontre pas une causalité.','Les valeurs indisponibles restent absentes.']};
}
