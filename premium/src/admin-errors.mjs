const rows=Object.freeze([
 {id:'err-001',timestamp:'2026-10-07T08:14:00.000Z',severity:'warning',module:'JUMOLF',message:'Données météo historiques incomplètes',context:'Fixture synthétique',version:'2.0.0-demo',environment:'QA',status:'open',actor_id:'DOG-023'},
 {id:'err-002',timestamp:'2026-10-06T17:21:00.000Z',severity:'error',module:'Notifications',message:'Événement mock non distribué',context:'Simulation locale',version:'2.0.0-demo',environment:'Preview',status:'resolved',actor_id:'USER-MOCK-02'},
 {id:'err-003',timestamp:'2026-10-06T11:45:00.000Z',severity:'info',module:'Scientific corpus',message:'Petit groupe masqué',context:'Garde anti-réidentification mock',version:'2.0.0-demo',environment:'QA',status:'open',actor_id:'CONTRIB-MOCK-04'}
]);
export function filterAdminErrors(filters={}){return rows.filter(row=>Object.entries(filters).every(([key,value])=>!value||row[key]===value)).map(row=>({...row}));}
export function adminDiagnostics(){return [{id:'gps',label:'GPS',status:'info',message:'Aucun GPS réel'},{id:'realtime',label:'Realtime',status:'info',message:'Simulation locale'},{id:'auth',label:'Auth',status:'info',message:'Aucune Auth réelle'},{id:'jumolf',label:'JUMOLF engine',status:'healthy',message:'Moteur mock déterministe'},{id:'corpus',label:'Scientific corpus',status:'healthy',message:'Corpus synthétique'}];}
export function adminAlerts(){return [{id:'alert-small-groups',severity:'info',message:'Certaines cohortes restent masquées sous le seuil mock.'},{id:'alert-realtime',severity:'warning',message:'Realtime reste simulé.'}];}
