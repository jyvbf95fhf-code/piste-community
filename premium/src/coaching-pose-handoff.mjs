// Keep the acknowledged TRACK_FINISHED state until the pose recorder is ready.
// A delayed return is an ordinary durable team message, never a search release.
export const RETURN_LATER_MESSAGE='Piste tracée · je reviens plus tard. Recherche en attente de mon retour.';
export function poseHandoffConfirmation(action,p={}){
 if(action==='return-later')return 'Confirmer votre retour plus tard ? Le tracé restera enregistré et la recherche en attente. Vous pourrez fermer l’application puis retrouver la session dans Mes sessions. À votre retour, appuyez sur « Je suis en place ».';
 if(action==='in-place')return p.scenario==='self_trace'?'Confirmer la fin de votre mise en place ? Vous devrez ensuite revenir au départ avant de démarrer la recherche.':'Confirmer que le traceur est en place et prêt à l’arrivée ? Le conducteur sera informé qu’il peut démarrer la recherche.';
 throw Error('Décision inconnue.');
}
export async function performPoseHandoff(action,{projection:p,confirm=globalThis.confirm,command}={}){
 if(!p||p.phase!=='TRACK_FINISHED'||p.role!==(p.poseRecorder??'traceur'))throw Error('Décision de fin de pose non autorisée.');
 if(!confirm(poseHandoffConfirmation(action,p)))return false;
 if(action==='in-place')await command('in-place');
 else await command('return-later');
 return true;
}
export function poseHandoffStatus(p){
 if(p?.phase==='TRACK_FINISHED')return 'Piste tracée · recherche en attente du retour et de la confirmation du traceur.';
 if(p?.phase==='SEARCH_READY')return 'Le traceur est en place · le conducteur peut démarrer la recherche.';
 return '';
}
