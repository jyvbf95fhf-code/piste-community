export const COMMUNITY_PROFILE_FIXTURES=Object.freeze([
 {id:'self',displayName:'Sébastien',avatar:null,role:'Conducteur · pisteur',specialty:'Pistage opérationnel',bio:'Le terrain, le chien et l’analyse de chaque trace.',location:'Île-de-France',dogIds:['nox'],disciplines:['Piste','Recherche'],publicStats:[{label:'Sessions partagées',value:'12'}],isFictional:true},
 {id:'alex',displayName:'Alex Martin',avatar:null,role:'Conducteur cynophile',specialty:'Pistage',bio:'Observer le terrain avant de lire la piste.',location:'Massif central',dogIds:['uma'],disciplines:['Piste','Recherche'],publicStats:[{label:'Retours terrain',value:'8'}],isFictional:true},
 {id:'camille',displayName:'Camille Dumas',avatar:null,role:'Coach terrain',specialty:'Lecture de piste',bio:'Partager des méthodes simples et des retours précis.',location:'Bourgogne',dogIds:['arko'],disciplines:['Piste','Détection'],publicStats:[{label:'Conseils publiés',value:'5'}],isFictional:true},
 {id:'lea',displayName:'Léa Bernard',avatar:null,role:'Observatrice',specialty:'Recherche',bio:'Prendre le temps de documenter les entraînements.',location:'Jura',dogIds:['uma'],disciplines:['Recherche'],publicStats:[{label:'Séances documentées',value:'6'}],isFictional:true},
 {id:'nicolas',displayName:'Nicolas Perrin',avatar:null,role:'Conducteur',specialty:'Pistage',bio:'Carnet de terrain et pistes préparées.',location:'Alpes',dogIds:['arko'],disciplines:['Piste'],publicStats:[],isFictional:true}
]);

export const COMMUNITY_POST_FIXTURES=Object.freeze([
 {id:'post-alex-forest',authorId:'alex',type:'training',visibility:'community',createdAt:'2026-09-28T08:30:00.000Z',dogId:'uma',photo:'/src/assets/hero-malinois-mountain.png',text:'Travail de lecture en lisière : nous avons pris le temps de comparer le vent et la végétation avant le départ.',attachment:{type:'session',sourceId:'fixture-session-alex',readOnly:true,fields:{environment:'Lisière forestière',difficulty:'Modérée'}},likes:['self','lea'],comments:[{id:'comment-alex-1',authorId:'lea',text:'Belle observation du terrain.'}]},
 {id:'post-camille-contacts',authorId:'camille',type:'technical',visibility:'contacts',createdAt:'2026-09-27T14:10:00.000Z',dogId:'arko',photo:null,text:'Retour terrain réservé aux contacts : garder une chronologie claire aide à relire les décisions.',attachment:null,likes:[],comments:[]},
 {id:'post-camille-private',authorId:'camille',type:'field-note',visibility:'private',createdAt:'2026-09-26T10:10:00.000Z',dogId:null,photo:null,text:'Note privée de préparation.',attachment:null,likes:[],comments:[]},
 {id:'post-lea-track',authorId:'lea',type:'track',visibility:'community',createdAt:'2026-09-25T09:00:00.000Z',dogId:'uma',photo:null,text:'Une trace préparée pour travailler les changements de sol.',attachment:{type:'track',sourceId:'gpx-pins',readOnly:true,fields:{distance:'850 m',provenance:'Préparé manuellement',environment:'Sous-bois'}},likes:['alex'],comments:[]},
 {id:'post-self-private',authorId:'self',type:'training',visibility:'private',createdAt:'2026-09-24T09:00:00.000Z',dogId:'nox',photo:null,text:'Brouillon personnel de retour terrain.',attachment:null,likes:[],comments:[]}
]);

export const COMMUNITY_CONTACT_FIXTURES=Object.freeze([{userIds:['self','alex']}]);
export const COMMUNITY_CONTACT_REQUEST_FIXTURES=Object.freeze([
 {id:'request-lea-self',fromUserId:'lea',toUserId:'self',status:'pending',createdAt:'2026-09-29T12:00:00.000Z'},
 {id:'request-self-camille',fromUserId:'self',toUserId:'camille',status:'pending',createdAt:'2026-09-29T12:30:00.000Z'}
]);
export const COMMUNITY_FOLLOW_FIXTURES=Object.freeze([
 {fromUserId:'self',toUserId:'alex'},{fromUserId:'self',toUserId:'camille'},{fromUserId:'lea',toUserId:'self'}
]);
export const COMMUNITY_NOTIFICATION_FIXTURES=Object.freeze([
 {id:'notification-lea-contact',recipientId:'self',actorId:'lea',type:'contact_request',createdAt:'2026-09-29T12:00:00.000Z',read:false}
]);
export const COMMUNITY_PHOTO_FIXTURES=Object.freeze([
 {id:'forest',label:'Terrain forestier',src:'/src/assets/hero-malinois-mountain.png',alt:'Chien sur un terrain naturel'},
 {id:'training',label:'Séance d’entraînement',src:'/src/assets/hero-terrain-sunset.png',alt:'Terrain d’entraînement naturel'}
]);
