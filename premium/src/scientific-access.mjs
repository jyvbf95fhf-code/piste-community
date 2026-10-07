export const scientificMembers=Object.freeze([
 Object.freeze({id:'sebastien',displayName:'Sébastien',role:'Analyste scientifique',source:'mock-member'}),
 Object.freeze({id:'ethologist-demo',displayName:'Éthologue · démonstration',role:'Éthologue autorisée',source:'mock-member'})
]);

export function scientificAccessFor(actor){
 if(actor?.id==='ethologist-demo')return{authorized:true,memberId:'ethologist-demo',displayName:'Éthologue · démonstration',role:'Éthologue autorisée'};
 if(actor?.name==='Sébastien'&&actor?.permissions?.research===true)return{authorized:true,memberId:'sebastien',displayName:'Sébastien',role:'Analyste scientifique'};
 return{authorized:false,memberId:null,displayName:actor?.name||'Visiteur',role:null};
}

export function scientificCorpusAccessFor(actor){
 if(actor?.id==='scientific-reader-demo')return{authorized:true,memberId:'scientific-reader-demo',displayName:'Lecteur scientifique · démonstration',role:'scientific_reader',readOnly:true};
 const access=scientificAccessFor(actor);
 if(!access.authorized)return{authorized:false,memberId:null,displayName:access.displayName,role:'standard',readOnly:true};
 return{...access,role:access.memberId==='sebastien'?'scientific_owner':'researcher',readOnly:false};
}
