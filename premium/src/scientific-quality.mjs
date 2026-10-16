const statusFor=level=>({high:'high',medium:'medium',low:'low',insufficient:'insufficient'}[level]||'missing');
export function explainScientificQuality(session){
 if(!session)return[];
 const missing=new Set(session.quality?.missingInputs||[]),available=new Set(session.quality?.availableInputs||[]),level=statusFor(session.quality?.level);
 const dimensions=[['gps','GPS','trace'],['timestamps','Horodatages','timestamps'],['weather','Météo','weather'],['reference','Trace de référence','referenceTrace'],['events','Événements','events']];
 return dimensions.map(([key,label,input])=>{const absent=missing.has(input)||(!available.has(input)&&input!=='events'&&!session[input]);const present=available.has(input)||Boolean(session[input]);return{key,label,status:absent?'missing':present?level:'insufficient',reason:absent?'Donnée indisponible':present?`Disponible · qualité ${level}`:'Complétude non établie',synthetic:session.synthetic===true};}).concat([{key:'completeness',label:'Complétude',status:level,reason:session.quality?.explanation||'Qualité non renseignée',synthetic:session.synthetic===true},{key:'consistency',label:'Cohérence',status:level,reason:session.source==='account'?'Cohérence à vérifier sur les points et horodatages enregistrés':'Cohérence descriptive héritée du dataset synthétique',synthetic:session.synthetic===true},{key:'provenance',label:'Provenance',status:session.provenance?'medium':'missing',reason:session.provenance?(session.source==='account'?'Origines du dossier explicites':'Origines mock explicites'):'Provenance indisponible',synthetic:session.synthetic===true}]);
}

export function scientificQualitySummary(session){
 const dimensions=explainScientificQuality(session),counts=Object.fromEntries(['high','medium','low','insufficient','missing'].map(status=>[status,dimensions.filter(item=>item.status===status).length]));
 return{level:statusFor(session?.quality?.level),score:session?.quality?.score??null,dimensions,counts,explanation:session?.quality?.explanation||'Qualité indisponible'};
}
