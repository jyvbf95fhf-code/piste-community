export function SessionExitMenu(view,{locked=false}={}){
 if(locked)return '';
 return `<details class="session-exit-menu"><summary aria-label="Menu de session">Session ▾</summary><div class="session-exit-options"><button type="button" data-session-exit="home">Retour à l’accueil</button>${view.canCancel?'<button type="button" data-session-exit="cancel">Annuler la session</button>':''}${view.canInterrupt?'<button type="button" data-session-exit="interrupt">Interrompre la session</button>':''}${view.canLeave?'<button type="button" data-session-exit="leave">Quitter la session</button>':''}</div></details>`;
}
export function ExitConfirmationMarkup(type){
 const collective=type!=='leave',title=type==='cancel'?'Annuler la session ?':type==='interrupt'?'Interrompre la session ?':'Quitter la session ?';
 return `<h2>${title}</h2><p>${collective?'Cet arrêt concerne tous les participants.':'Votre participation et votre suivi personnel s’arrêtent. Les autres participants peuvent poursuivre selon leurs droits.'} Les données enregistrées sont conservées.${type==='interrupt'?' L’exercice sera enregistré comme interrompu, avec un compte rendu partiel.':''}</p><label>Motif · facultatif<textarea data-exit-reason maxlength="1000" rows="2"></textarea></label><div class="dialog-actions"><button class="button button-dark" data-exit-cancel>Revenir</button><button class="button button-gold" data-exit-confirm>Confirmer</button></div>`;
}
