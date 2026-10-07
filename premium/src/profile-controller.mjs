export function createProfileController({store,communityStore,getDogs=()=>[],notificationStore=null,render=()=>{},navigate=()=>{}}={}){
 if(!store||!communityStore)throw new TypeError('Stores Profil et Communauté requis.');
 function dispatch(action,payload={}){
  if(action==='set-primary-dog'){
   const dogId=String(payload.dogId||'');if(!getDogs().some(dog=>dog.id===dogId))throw new Error('Choisissez un chien de votre liste.');
   store.setPrimaryDog(dogId);render();return dogId;
  }
  if(action==='clear-primary-dog'){store.setPrimaryDog(null);render();return null;}
  if(action==='set-avatar'){store.setAvatar(payload.value);render();return payload.value;}
  if(action==='set-notification'){
   if(!notificationStore)throw new Error('Préférences de notification indisponibles.');
   if(!['notify_live_in_app','notify_live_email','notify_live_push'].includes(payload.key))throw new Error('Préférence inconnue.');
   notificationStore.setPreferences(communityStore.viewerId,{[payload.key]:payload.value===true});render();return true;
  }
  if(action==='set-preference'){store.setPreferences({[payload.key]:payload.value});render();return true;}
  if(action==='open'){navigate(payload.href);return true;}
  throw new Error('Action Profil indisponible.');
 }
 function submit(kind,payload={}){
  if(kind!=='account')return false;
  communityStore.updateOwnProfile({displayName:payload.displayName});if(payload.avatar)store.setAvatar(payload.avatar);render();return true;
 }
 function handleClick(event){const node=event.target?.closest?.('[data-profile-action]');if(!node)return false;event.preventDefault();try{dispatch(node.dataset.profileAction,{dogId:node.dataset.dogId,key:node.dataset.key,value:node.dataset.value,href:node.dataset.href});}catch(error){node.dataset.error=error.message;}return true;}
 function handleChange(event){const field=event.target;if(field?.matches?.('[data-profile-preference]')){try{dispatch('set-preference',{key:field.dataset.profilePreference,value:field.value});}catch(error){field.dataset.error=error.message;}return true;}if(field?.matches?.('[data-profile-notification]')){try{dispatch('set-notification',{key:field.dataset.profileNotification,value:field.checked});}catch(error){field.checked=!field.checked;field.dataset.error=error.message;}return true;}if(field?.matches?.('[data-profile-primary-dog]')){try{dispatch(field.value?'set-primary-dog':'clear-primary-dog',{dogId:field.value});}catch(error){field.dataset.error=error.message;}return true;}return false;}
 function handleSubmit(event){const form=event.target?.closest?.('[data-profile-form]');if(!form)return false;event.preventDefault();if(form.dataset.profileForm==='account'){const data=new FormData(form);try{submit('account',{displayName:data.get('displayName'),avatar:data.get('avatar')});}catch(error){const status=form.querySelector('[role="status"]');if(status)status.textContent=error.message;}}return true;}
 return Object.freeze({dispatch,submit,handleClick,handleChange,handleSubmit});
}
