export function createProfileController({store,communityStore,savePhoto=photo=>store.setPhoto(photo),getDogs=()=>[],notificationStore=null,render=()=>{},navigate=()=>{}}={}){
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
 function handleClick(event){const node=event.target?.closest?.('[data-profile-action]');if(!node)return false;event.preventDefault();try{dispatch(node.dataset.profileAction,{dogId:node.dataset.dogId,key:node.dataset.key,value:node.dataset.value,href:node.dataset.href});}catch(error){node.dataset.error=error.message;render();}return true;}
 function handleChange(event){const field=event.target;if(field?.matches?.('[data-profile-preference]')){try{dispatch('set-preference',{key:field.dataset.profilePreference,value:field.value});}catch(error){field.dataset.error=error.message;render();}return true;}if(field?.matches?.('[data-profile-notification]')){try{dispatch('set-notification',{key:field.dataset.profileNotification,value:field.checked});}catch(error){field.checked=!field.checked;field.dataset.error=error.message;render();}return true;}if(field?.matches?.('[data-profile-primary-dog]')){try{dispatch(field.value?'set-primary-dog':'clear-primary-dog',{dogId:field.value});}catch(error){field.dataset.error=error.message;render();}return true;}return false;}
 async function saveAccountForm(form){
  const data=new FormData(form),photo=data.get('profilePhoto');
  const button=form.querySelector('button[type="submit"]');
  if(button?.disabled)return;
  if(button)button.disabled=true;
  try{
   if(photo?.size){
    if(photo.size>15*1024*1024)throw Error('Choisissez une photo de 15 Mo maximum.');
    const url=URL.createObjectURL(photo);
    try{
     const image=new Image();image.src=url;await image.decode();
     if(!form.isConnected)return;
     const canvas=form.ownerDocument.createElement('canvas'),scale=Math.min(1,320/Math.max(image.naturalWidth,image.naturalHeight));
     canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
     canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
     canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
     await savePhoto(canvas.toDataURL('image/jpeg',.78));
    }finally{URL.revokeObjectURL(url);}
   }else if(data.has('removeProfilePhoto'))await savePhoto(null);
   if(!form.isConnected)return;
   submit('account',{displayName:data.get('displayName'),avatar:data.get('avatar')});
  }catch(error){
   const status=form.querySelector('[role="status"]');
   if(status)status.textContent=error.message||'Cette photo n’a pas pu être lue.';
  }finally{if(button)button.disabled=false;}
 }
 function handleSubmit(event){
  const form=event.target?.closest?.('[data-profile-form]');
  if(!form)return false;
  event.preventDefault();
  if(form.dataset.profileForm==='account')void saveAccountForm(form);
  return true;
 }
 return Object.freeze({dispatch,submit,handleClick,handleChange,handleSubmit});
}
