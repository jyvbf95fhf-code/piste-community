import {escapeHTML as e} from './components.mjs';
import {LOBO_DEMO_OWNER_ID,deserializeLoboDemoRows} from './lobo-demo-data.mjs';
import {inventoryAccountTestData,resetAccountTestData,ACCOUNT_TEST_RESET_TARGET} from './account-test-data-reset.mjs';
// Reads the existing private APIs only; no fixture fallback and no cloud mutation.
export function createLoboAccountController({getViewer,verifyUser,repository,call,storage,indexedDB,onChange=()=>{},beforeReset=()=>{},afterReset=async()=>{}}){
 let bundle=null,owner=null,pending=null,inventory=null,downloaded=false,notice='';
 const eligible=()=>{const u=getViewer();return u?.user_id===LOBO_DEMO_OWNER_ID&&u.admin_role==='owner_admin';};
 const active=()=>{if(!eligible()||owner!==LOBO_DEMO_OWNER_ID)throw Error('Compte de démonstration indisponible.');};
 async function verified(){active();const user=await verifyUser();active();if(user?.id!==owner||user.email!==ACCOUNT_TEST_RESET_TARGET.email)throw Error('Identité du compte non vérifiée.');}
 function snapshot(){if(!eligible()){bundle=null;inventory=null;downloaded=false;owner=null;return null;}if(owner!==LOBO_DEMO_OWNER_ID){owner=LOBO_DEMO_OWNER_ID;bundle=null;inventory=null;downloaded=false;}return bundle;}
 async function refresh(){snapshot();if(!eligible())return null;if(pending)return pending;bundle={status:'loading'};
  pending=(async()=>{const repo=repository(owner);try{await verified();const records=[];for(const kind of ['dog','ops','session-dog-link']){let cursor=null;const seen=new Set();do{const page=await repo.list({kind,cursor});active();records.push(...page.records.filter(r=>!r.deletedAt));cursor=page.cursor;if(cursor&&seen.has(cursor))throw Error('Pagination répétée.');seen.add(cursor);}while(cursor);}
   const result=await call({operation:'list'});active();const value=deserializeLoboDemoRows({personalRecords:records,coachingSessions:result.sessions||[],ownerId:owner});
   if(!value.dog&&!value.sources.length){bundle={...value,personalRecords:records,status:'empty'};return bundle;}
   if(!value.dog||value.sources.length!==40||value.sources.filter(s=>s.kind==='coaching').length!==20||value.sources.filter(s=>s.kind==='operational').length!==20)throw Error('Jeu LOBO incomplet : aucune donnée manquante n’est simulée.');
   bundle={...value,personalRecords:records,status:'ready'};return bundle;
  }catch(error){if(eligible())bundle={status:'error',error:error.message};return bundle;}finally{repo.dispose?.();pending=null;onChange();}})();return pending;
 }
 function screen(){snapshot();if(!eligible())return '<section class="jumolf-panel"><h1>Accès indisponible</h1></section>';return `<section class="jumolf-panel" data-lobo-reset><h1>Vider les données de test de cet appareil</h1><p>Uniquement le compte administrateur connecté, sur cette adresse Safari. Les accès, consentements et autres comptes sont conservés. Le serveur n’est pas modifié.</p><p role="status">${e(notice)}</p><button class="jumolf-button secondary" data-lobo-action="inventory">Examiner les données locales</button>${inventory?.ok?`<p>${inventory.localStorage.eligible.length} stockages locaux, ${inventory.journal.records} éléments du journal et ${inventory.queues.entries} files de commandes concernés.</p><label><input type="checkbox" data-lobo-discard-confirmed> Supprimer ces données de test sans sauvegarde et sans restaurer de démonstration.</label><button class="jumolf-button primary" data-lobo-action="discard">Vider cet appareil</button><button class="jumolf-button secondary" data-lobo-action="download">Télécharger une sauvegarde facultative</button>${downloaded?'<label><input type="checkbox" data-lobo-backup-verified> J’ai enregistré et vérifié la sauvegarde téléchargée.</label><button class="jumolf-button primary" data-lobo-action="reset">Nettoyer cet appareil</button>':''}`:''}<a href="/jumolf">Retour à JUMOLF</a></section>`;}
 async function action(type,{backupVerified=false,discardConfirmed=false,download=()=>{}}={}){snapshot();try{await verified();const options={ownerId:owner,email:ACCOUNT_TEST_RESET_TARGET.email,ownerVerified:true,storage,indexedDB};
  if(type==='refresh')return await refresh();
  if(type==='inventory'){inventory=await inventoryAccountTestData(options);active();downloaded=false;if(!inventory.ok)throw Error(inventory.error);notice='Inventaire terminé. Vous pouvez supprimer les tests sans sauvegarde, ou exporter une copie facultative.';}
  else if(type==='download'){if(!inventory?.ok)throw Error('Inventaire requis.');download(inventory.backupJson);downloaded=true;notice='Vérifiez le fichier téléchargé avant de confirmer.';}
  else if(type==='reset'||type==='discard'){const discard=type==='discard'&&discardConfirmed===true;if(!discard&&(!downloaded||!backupVerified))throw Error('Confirmez la suppression sans sauvegarde ou vérifiez votre export.');beforeReset();const result=await resetAccountTestData({...options,inventory,backupVerified:!discard&&backupVerified,discardConfirmed:discard});active();if(!result.ok)throw Error(result.error);inventory=null;downloaded=false;bundle={status:'empty',dog:null,sources:[],personalRecords:[],coachingProjections:[]};await afterReset(bundle);active();notice='Données locales supprimées. Aucune démonstration restaurée. Rechargez la page pour terminer.';}

 }catch(error){notice=error.message;}onChange();}
 return {snapshot,refresh,screen,action};
}
