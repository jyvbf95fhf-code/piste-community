const rows=Object.freeze([
 {id:'deploy-prod-demo',version:'2.0.0-demo',build:'build-2026.10.07.1',sha:'a1b2c3d-mock',environment:'Production',date:'2026-10-06T12:00:00.000Z',status:'ready',author:'Simulation',notes:'Fixture historique',read_only:true},
 {id:'deploy-preview-demo',version:'2.0.0-preview-demo',build:'build-2026.10.07.2',sha:'e4f5a6b-mock',environment:'Preview',date:'2026-10-07T08:00:00.000Z',status:'ready',author:'Simulation',notes:'Aperçu local fictif',read_only:true},
 {id:'deploy-qa-demo',version:'2.0.0-qa-demo',build:'qa-2026.10.07',sha:'c7d8e9f-mock',environment:'QA',date:'2026-10-07T09:00:00.000Z',status:'passed',author:'Simulation',notes:'Contrôles locaux',read_only:true}
]);
export function listAdminDeployments(){return rows.map(row=>({...row}));}
export function adminCurrentVersion(){return {label:'Simulation Admin · version locale mock',app_version:'2.0.0-demo',build:'build-2026.10.07.2',environment:'Preview'};}
