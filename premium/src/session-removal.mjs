import {escapeHTML as e} from './components.mjs';
import {LOBO_DEMO_MANIFEST} from './lobo-demo-identity.mjs';
const protectedIds=new Set([...LOBO_DEMO_MANIFEST.opsIds,...LOBO_DEMO_MANIFEST.coachingIds]);
const validOwner=id=>typeof id==='string'&&id.trim()===id&&id.length>0;
export const isProtectedSessionId=id=>typeof id==='string'&&protectedIds.has(id.replace(/^cloud-/,''));

// A local owner scope is required for legacy Coaching snapshots, which contain no account ID.
// This policy never converts archive/leave into a remote delete command.
export function sessionRemovalPolicy(record,{ownerId,localOwnerId,currentSessionId='',protectedIds:extra=[]}={}){
 const session=record?.session??record;
 const id=session?.id??'';
 const kind=record?.kind==='ops'||record?.kind==='operational'?'operational':'coaching';
 const shared=record?.source==='shared'||record?.sharedId||kind==='coaching'&&!record?.session;
 const cloud=!!record?.cloudReadOnly||record?.kind==='ops'&&Number.isSafeInteger(record.revision);
 const cloudId=record?.cloudId??(cloud?record.id:null);
 const cloudRevision=record?.cloudRevision??(cloud?record.revision:null);
 const explicitOwners=[record?.ownerUserId,record?.ownerId,record?.owner_id,session?.ownerId,session?.ownerUserId].filter(v=>v!==undefined&&v!==null);
 const knownOwner=explicitOwners[0]??(!shared&&kind==='coaching'?localOwnerId:null);
 const own=validOwner(ownerId)&&knownOwner===ownerId&&explicitOwners.every(v=>v===ownerId);
 const phase=record?.searchState?.phase??record?.phase??record?.preparationState?.phase;
 const terminal=['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED'].includes(phase)||['Terminée','Archivée','À compléter'].includes(record?.status);
 const active=kind==='coaching'&&!terminal||id===currentSessionId&&!terminal||['SEARCH_RUNNING','SEARCH_PAUSED','LAYING','PREPARATION','LAYING_WAIT','SEARCH_READY'].includes(phase)||['En cours'].includes(record?.status)||['active','paused'].includes(record?.trackingState);
 let reason=!id?'Session introuvable.':isProtectedSessionId(id)||isProtectedSessionId(cloudId)||extra.includes(id)?'Les 40 séances de démonstration LOBO sont protégées.':!own?'Suppression réservée au propriétaire identifié de cette session.':active?'Arrêtez et quittez la session active avant de la supprimer.':'';
 const canRemoveLocal=!reason&&!shared;
 const canRemoveCloud=!reason&&kind==='operational'&&cloud&&!!cloudId&&Number.isSafeInteger(cloudRevision)&&cloudRevision>0;
 return {id,kind,ownerId:knownOwner??null,canRemoveLocal,canRemoveCloud,cloudId,cloudRevision,
  localReason:reason||(shared?'Cette session Coaching partagée ne possède pas de copie locale supprimable.':''),
  cloudReason:reason||(kind==='coaching'?'La suppression des sessions Coaching cloud nécessite une prise en charge du serveur.':!cloud?'Aucune sauvegarde cloud identifiée pour cette session.':!canRemoveCloud?'Révision cloud indisponible.':'')};
}

export function SessionRemovalMenu(policy){
 if(!policy?.id)return '';
 const button=(scope,label)=>`<button type="button" data-session-remove="${scope}" data-session-id="${e(policy.id)}" data-session-kind="${e(policy.kind)}">${label}</button>`;
 return `<details class="session-removal-menu"><summary aria-label="Options de la session">⋯</summary><div>${policy.canRemoveLocal?button('local','Supprimer de cet appareil'):''}${policy.canRemoveCloud?button('cloud','Supprimer du cloud'):''}${!policy.canRemoveCloud&&policy.cloudReason?`<small>${e(policy.cloudReason)}</small>`:''}${!policy.canRemoveLocal&&policy.localReason&&policy.localReason!==policy.cloudReason?`<small>${e(policy.localReason)}</small>`:''}</div></details>`;
}

export function SessionRemovalConfirmation(policy,{scope='local'}={}){
 const cloud=scope==='cloud';
 if(!policy||(cloud?!policy.canRemoveCloud:!policy.canRemoveLocal))return null;
 return {title:cloud?'Supprimer cette session du cloud ?':'Supprimer cette session de cet appareil ?',description:cloud?'La sauvegarde cloud de cette session sera supprimée. Cette action ne supprime pas les chiens, les pistes préparées, les consentements ou les autres sessions.':'Seule la copie de cette session sur cet appareil sera supprimée. Sa sauvegarde cloud éventuelle et les autres sessions seront conservées.'};
}
