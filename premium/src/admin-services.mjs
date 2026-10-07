export const adminServices=Object.freeze([
 {id:'github',name:'GitHub',status:'healthy',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:42,message:'Dépôt mock disponible',read_only:true},
 {id:'vercel',name:'Vercel',status:'healthy',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:88,message:'Projet Preview mock disponible',read_only:true},
 {id:'supabase',name:'Supabase',status:'unknown',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:null,message:'Aucune vérification réelle effectuée',read_only:true},
 {id:'auth',name:'Auth',status:'unknown',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:null,message:'Simulation locale uniquement',read_only:true},
 {id:'realtime',name:'Realtime',status:'degraded',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:180,message:'Temps réel non connecté',read_only:true},
 {id:'gps',name:'Ingestion GPS',status:'unknown',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:null,message:'Aucune ingestion réelle',read_only:true},
 {id:'weather',name:'Météo',status:'healthy',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:0,message:'Données de démonstration uniquement',read_only:true},
 {id:'notifications',name:'Notifications',status:'healthy',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:0,message:'Événements locaux mock',read_only:true},
 {id:'storage',name:'Stockage',status:'unknown',checked_at:'2026-10-07T08:00:00.000Z',latency_ms:null,message:'Aucun stockage distant interrogé',read_only:true}
]);
export const adminQuotas=Object.freeze([{id:'database',name:'Base de données',status:'normal',usage:'Simulation'},{id:'storage',name:'Stockage',status:'normal',usage:'Simulation'},{id:'bandwidth',name:'Bande passante',status:'surveillance',usage:'Simulation'},{id:'functions',name:'Fonctions',status:'normal',usage:'Simulation'},{id:'vercel',name:'Vercel',status:'normal',usage:'Simulation'}]);
export function getAdminServiceSummary(){const healthy=adminServices.filter(item=>item.status==='healthy').length;return {label:'Simulation Admin · données de démonstration',healthy,total:adminServices.length,services:adminServices,quotas:adminQuotas};}
