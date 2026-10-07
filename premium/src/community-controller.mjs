import {buildCommunitySharePayload} from './community-model.mjs';

export function createCommunityController({store,sourceOptions=[],origin='',navigate=()=>{},render=()=>{},toast=()=>{},nativeShare=null,copyLink=null,confirmAction=null}={}){
 let pendingPost=null;
 const options=()=>typeof sourceOptions==='function'?sourceOptions():sourceOptions;
 const getSource=(type,id)=>{
  if(!['session','track'].includes(type))throw new Error('Les missions OPS sont exclues des partages Communauté.');
  const result=options().find(item=>item.type===type&&item.id===id);
  if(!result)throw new Error('Cette source n’est pas disponible pour le partage.');
  return structuredClone(result);
 };
 const closeConfirmation=()=>{if(typeof document==='undefined')return;const dialog=document.querySelector('[data-community-confirm-dialog]');if(dialog?.open)dialog.close();};
 const presentConfirmation=()=>{
  if(typeof document==='undefined')return;
  const dialog=document.querySelector('[data-community-confirm-dialog]');if(!dialog)return;
  const text=String(pendingPost?.text||'').trim();
  const visibility=pendingPost?.visibility||'private';
  const fields=Object.keys(pendingPost?.source?.data||{});
  const labels={private:'Privé',contacts:'Contacts acceptés',community:'Communauté'};
  const description=dialog.querySelector('[data-community-confirm-description]');
  if(description)description.textContent=`${text||'Contenu visuel ou piste sélectionnée'} · Visibilité : ${labels[visibility]||labels.private}. Vérifiez l’aperçu avant publication.`;
  if(!dialog.open)dialog.showModal();
 };
 const finish=(result,{refresh=true}={})=>{if(refresh)render();return result;};
 function dispatch(action,payload={}){
  const {userId,postId,commentId}=payload;
  if(action==='follow')return finish(store.follow(userId));
  if(action==='unfollow')return finish(store.unfollow(userId));
  if(action==='contact-request')return finish(store.sendContactRequest(userId));
  if(action==='accept-contact'){
   const request=store.getContactRequests().received.find(item=>item.fromUserId===userId);
   return finish(request?store.acceptContactRequest(request.id):false);
  }
  if(action==='refuse-contact'){
   const request=store.getContactRequests().received.find(item=>item.fromUserId===userId);
   return finish(request?store.refuseContactRequest(request.id):false);
  }
  if(action==='cancel-contact'){
   const request=store.getContactRequests().sent.find(item=>item.toUserId===userId);
   return finish(request?store.cancelContactRequest(request.id):false);
  }
  if(action==='remove-contact')return finish(store.removeContact(userId));
  if(action==='set-contact-permission')return finish(store.setContactPermission(userId,payload.permission,payload.enabled));
  if(action==='search-contacts')return store.searchContacts(payload.query||'');
  if(action==='like')return finish(store.toggleLike(postId));
  if(action==='delete-comment')return finish(store.deleteOwnComment(postId,commentId));
  if(action==='report-post')return finish(store.reportPost(postId,'Signalement mock'));
  if(action==='hide-post')return finish(store.hidePost(postId));
  if(action==='delete-post')return finish(store.deleteOwnPost(postId));
  if(action==='share-post'||action==='share-track'){
   const post=store.getVisiblePost(postId);if(!post)throw new Error('Cette publication n’est pas visible ou disponible.');
   return buildCommunitySharePayload(action==='share-track'?'track':'post',post,origin);
  }
  if(action==='cancel-post'){pendingPost=null;closeConfirmation();return true;}
  if(action==='confirm-post'){
   if(!pendingPost)throw new Error('Aucun brouillon à publier.');
   const created=store.createPost(pendingPost);pendingPost=null;closeConfirmation();navigate(`/community/post/${encodeURIComponent(created.id)}`);return finish(created,{refresh:false});
  }
  if(action==='mark-notification-read')return finish(store.markNotificationRead(payload.notificationId));
  throw new Error('Action Communauté indisponible.');
 }
 function submit(kind,payload={}){
  if(kind==='profile')return finish(store.updateOwnProfile({displayName:payload.displayName}));
  if(kind==='comment')return finish(store.addComment(payload.postId,payload.text));
  if(kind==='search'){
   const query=String(payload.query||'').trim();const path=query?`/community/search?q=${encodeURIComponent(query)}`:'/community/search';navigate(path);return path;
  }
  if(kind==='contact-search'){
   const query=String(payload.query||'').trim();const path=query?`/community/contacts?q=${encodeURIComponent(query)}`:'/community/contacts';navigate(path);return path;
  }
  if(kind==='post-create'){
   let source=null;
   if(payload.sourceType||payload.sourceId){const selected=getSource(payload.sourceType,payload.sourceId);source={type:selected.type,id:selected.id,data:selected.data,fields:[...(payload.fields||[])]};}
   pendingPost={text:payload.text||'',visibility:payload.visibility||'private',dogId:payload.dogId||null,photo:payload.photo||null,source};
   presentConfirmation();return {pending:true,visibility:pendingPost.visibility,sourceType:source?.type||null};
  }
  throw new Error('Formulaire Communauté indisponible.');
 }
 function changeSource(type,id){
  if(!type&&!id){const path='/community/new';navigate(path);return path;}
  const source=getSource(type,id),params=new URLSearchParams({sourceType:source.type,sourceId:source.id});
  const path=`/community/new?${params}`;navigate(path);return path;
 }
 async function deliverShare(payload){
  const share=nativeShare||globalThis.navigator?.share?.bind(globalThis.navigator);
  if(share){try{await share(payload);return true;}catch(error){if(error?.name==='AbortError')return false;}}
  const copy=copyLink||globalThis.navigator?.clipboard?.writeText?.bind(globalThis.navigator.clipboard);
  if(copy){try{await copy(payload.url);toast('Lien copié · partage mock, sans envoi externe.');return true;}catch{}}
  if(typeof document!=='undefined'){
   const dialog=document.createElement('dialog');dialog.className='community-share-fallback';
   const title=document.createElement('h2');title.textContent=payload.kind==='track'?'Partager la piste':'Partager la publication';
   const input=document.createElement('input');input.readOnly=true;input.value=payload.url;input.setAttribute('aria-label','Lien de partage mock');
   const close=document.createElement('button');close.type='button';close.className='button button-gold';close.textContent='Fermer';close.addEventListener('click',()=>dialog.close());
   const note=document.createElement('p');note.textContent='Aucun service externe n’a été appelé. Copiez ce lien pour le partager.';
   dialog.append(title,note,input,close);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();input.focus();input.select();
  }
  return false;
 }
 function handleClick(event){
  const button=event.target.closest?.('[data-community-action]');if(!button)return false;
  event.preventDefault();const action=button.dataset.communityAction;
  try{
   if(action==='delete-post'){
    const confirm=confirmAction||globalThis.confirm;
    if(confirm&&!confirm('Supprimer votre publication mock ?'))return true;
   }
   const payload={userId:button.dataset.userId,postId:button.dataset.postId,commentId:button.dataset.commentId,notificationId:button.dataset.notificationId};
   const result=dispatch(action,payload);
   if(action==='share-post'||action==='share-track')void deliverShare(result);
   return true;
  }catch(error){toast(error.message);return true;}
 }
 function handleSubmit(event){
  const form=event.target.closest?.('[data-community-form]');if(!form)return false;
  event.preventDefault();const data=new FormData(form),kind=form.dataset.communityForm;
  try{
   if(kind==='profile')submit('profile',{displayName:data.get('displayName')});
   else if(kind==='comment')submit('comment',{postId:form.dataset.postId,text:data.get('text')});
   else if(kind==='search')submit('search',{query:data.get('q')});
   else if(kind==='contact-search')submit('contact-search',{query:data.get('q')});
   else if(kind==='post-create')submit('post-create',{
    text:data.get('text'),visibility:data.get('visibility'),dogId:data.get('dogId'),photo:data.get('photo'),
    sourceType:form.dataset.sourceType,sourceId:form.dataset.sourceId,fields:data.getAll('shareFields')
   });
   return true;
  }catch(error){toast(error.message);return true;}
 }
 function handleChange(event){
  const field=event.target;
  if(field.matches?.('[data-community-permission]')){
   try{dispatch('set-contact-permission',{userId:field.dataset.userId,permission:field.dataset.communityPermission,enabled:field.checked});}catch(error){toast(error.message);render();}
   return true;
  }
  if(field.matches?.('[data-community-source-picker]')){
   try{
    if(!field.value){changeSource('','');return true;}
    const split=field.value.indexOf(':');if(split<0)throw new Error('Source indisponible.');
    changeSource(field.value.slice(0,split),field.value.slice(split+1));return true;
   }catch(error){toast(error.message);return true;}
  }
  if(field.name==='shareFields'||field.name==='visibility')updatePreview(field.closest('form')||document.querySelector('[data-community-form="post-create"]'));
  return false;
 }
 function updatePreview(form){
  if(!form)return;
  const text=form.elements.text?.value?.trim()||'Seuls le texte, le chien, la photo et les champs cochés ci-dessus seront publiés.';
 if(typeof document==='undefined')return;
 const target=document.querySelector('[data-community-preview-text]');if(target)target.textContent=text;
  const output=document.querySelector('[data-community-preview-fields]');if(!output)return;
  const selected=[...document.querySelectorAll('[name="shareFields"]:checked')].map(field=>field.value);
  output.textContent=selected.length?selected.map(value=>({dog:'Chien',distance:'Distance',trackAge:'Âge de piste',environment:'Environnement',difficulty:'Difficulté',result:'Résultat',map:'Carte / tracé',points:'Points du tracé',provenance:'Provenance'}[value]||value)).join(' · '):'Aucune donnée de session ou de piste sélectionnée.';
 }
 return Object.freeze({dispatch,submit,changeSource,handleClick,handleSubmit,handleChange,updatePreview,deliverShare,getSource,pendingPost:()=>pendingPost});
}
