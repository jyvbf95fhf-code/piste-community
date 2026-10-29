import {escapeHTML as e} from './components.mjs';
import {createReportDraftStore} from './report-draft.mjs';
function sourceParts(article){return {map:[...article.querySelectorAll('h3')].find(h=>h.textContent.startsWith('Carte'))?.nextElementSibling,badge:article.querySelector('[data-search-outcome]')};}
function renderDraft(article,draft){
 const parts=sourceParts(article),map=parts.map?.cloneNode(true),badge=parts.badge?.cloneNode(true);article.replaceChildren();
 const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;article.append(el);return el;};
 add('h2',draft.title);add('p','Rapport personnalisé par son auteur · les données de la séance originale restent inchangées.');
 if(badge){add('h3','Résultat déclaré dans le dossier');article.append(badge);}
 for(const section of draft.sections.filter(s=>s.enabled)){add('h3',section.title);add('p',section.text);}
 if(map){add('h3','Carte issue du dossier');article.append(map);}
 for(const photo of draft.photos){const figure=document.createElement('figure'),img=document.createElement('img');img.src=photo.dataUrl;img.alt=photo.caption||'Photo ajoutée au rapport';img.style.maxWidth='100%';figure.append(img);if(photo.caption){const caption=document.createElement('figcaption');caption.textContent=photo.caption;figure.append(caption);}article.append(figure);}
}
export function restoreReportDraft({article,ownerId,sessionId,storage=globalThis.localStorage}={}){
 if(!article||!ownerId||!sessionId)return false;const draft=createReportDraftStore({storage,ownerId,sessionId}).read();if(!draft)return false;renderDraft(article,draft);return true;
}
async function readyImages(article){for(const img of article.querySelectorAll('figure img')){try{await img.decode();}catch{throw Error('Une photo n’est pas chargée. Réessayez avant de générer le PDF.');}}}
export async function printPersonalReport({article,ownerId,getOwnerId,print=()=>window.print()}={}){
 if(!article?.isConnected||getOwnerId()!==ownerId)throw Error('Compte ou dossier changé.');await readyImages(article);
 if(!article.isConnected||getOwnerId()!==ownerId)throw Error('Compte ou dossier changé.');print();
}
export function openReportEditor({article,ownerId,sessionId,getOwnerId,storage=localStorage}={}){
 if(!article||!ownerId||!sessionId)return;
 const store=createReportDraftStore({storage,ownerId,sessionId}),parts=sourceParts(article),sections=[];let current=null;
 for(const child of article.children){if(child.tagName==='H3'){current=child.textContent.startsWith('Carte')||child.textContent.startsWith('Résultat')?null:{title:child.textContent,text:'',enabled:true};if(current)sections.push(current);}else if(current&&child!==parts.map&&!child.querySelector('[data-gps-map]')&&!child.matches('[data-gps-map]'))current.text+=(child.tagName==='DL'?[...child.querySelectorAll(':scope > div')].map(row=>(row.querySelector('dt')?.textContent||'')+' : '+(row.querySelector('dd')?.textContent||'')).join('\n'):child.innerText||child.textContent||'')+'\n';}
 for(const title of ['Observations sur l’intervention','Travail du chien'])if(!sections.some(s=>s.title===title))sections.push({title,text:'',enabled:true});
 let draft=store.read()||{title:article.querySelector('h2')?.textContent||'Rapport de session',sections,photos:[]},photosBusy=false;
 const dialog=document.createElement('dialog');dialog.className='report-edit-dialog';dialog.dataset.pisteOwner=ownerId;dialog.dataset.pisteRoute=location.pathname+location.search;
 dialog.innerHTML=`<form method="dialog"><header><h2>Personnaliser mon rapport</h2><button value="close" aria-label="Fermer">×</button></header><p>Ajoutez vos observations et jusqu’à quatre photos légendées. Ce brouillon et ses photos sont conservés sur cet appareil, pour ce compte. L’archive et les observations de mission restent distinctes.</p><label>Titre<input name="title" maxlength="180" value="${e(draft.title)}"></label><div data-report-sections>${draft.sections.map((s,i)=>`<fieldset><label><input type="checkbox" data-report-enabled="${i}" ${s.enabled?'checked':''}>${e(s.title)}</label><textarea data-report-text="${i}" rows="4" maxlength="12000" aria-label="${e(s.title)}">${e(s.text)}</textarea></fieldset>`).join('')}</div><button type="button" data-report-add-section>Ajouter une section</button><label>Photos (4 maximum)<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-report-photos></label><div data-report-photo-list></div><p role="status" data-report-edit-status></p><button type="button" data-report-save>Enregistrer le brouillon</button><button type="button" data-report-apply>Prévisualiser le rapport</button><button type="button" data-report-print>Imprimer / PDF</button></form>`;
 const active=()=>getOwnerId()===ownerId&&document.contains(article)&&article.closest('[data-session-dossier]')?.dataset.sessionDossier===sessionId;
 const status=text=>dialog.querySelector('[data-report-edit-status]').textContent=text;
 const read=()=>({...draft,title:dialog.querySelector('[name=title]').value,sections:[...dialog.querySelectorAll('[data-report-text]')].map((field,i)=>({title:draft.sections[i].title,text:field.value,enabled:dialog.querySelector(`[data-report-enabled="${i}"]`).checked})),photos:draft.photos.map((p,i)=>({...p,caption:dialog.querySelector(`[data-report-caption="${i}"]`)?.value??p.caption}))});
 const photos=()=>{dialog.querySelector('[data-report-photo-list]').innerHTML=draft.photos.map((p,i)=>`<figure><img src="${p.dataUrl}" alt="Photo ajoutée au rapport"><label>Légende de la photo ${i+1}<input type="text" maxlength="240" data-report-caption="${i}" value="${e(p.caption)}"></label><button type="button" data-report-photo-remove="${i}">Retirer</button></figure>`).join('');};
 const apply=()=>{if(!active())throw Error('Ce dossier ou le compte a changé.');draft=store.save(read());renderDraft(article,draft);status('Rapport personnalisé et brouillon enregistrés.');};
 dialog.addEventListener('click',async event=>{try{
  if(event.target.closest('[data-report-save],[data-report-apply],[data-report-print]')&&photosBusy)throw Error('Attendez la préparation des photos.');
  if(event.target.closest('[data-report-save]')){if(!active())throw Error('Compte ou dossier changé.');draft=store.save(read());status('Brouillon enregistré sur cet appareil.');}
  if(event.target.closest('[data-report-apply]')){apply();dialog.close();}
  if(event.target.closest('[data-report-print]')){apply();await printPersonalReport({article,ownerId,getOwnerId,print:()=>{dialog.close();window.print();}});}
  const remove=event.target.closest('[data-report-photo-remove]');if(remove){draft=read();draft.photos.splice(Number(remove.dataset.reportPhotoRemove),1);photos();}
  if(event.target.closest('[data-report-add-section]')){if(draft.sections.length>=20)throw Error('20 sections maximum.');const title=prompt('Titre de la section');if(!title)return;draft=read();const i=draft.sections.length;draft.sections.push({title:title.slice(0,120),text:'',enabled:true});const field=document.createElement('fieldset');field.innerHTML=`<label><input type="checkbox" data-report-enabled="${i}" checked>${e(title.slice(0,120))}</label><textarea data-report-text="${i}" rows="4" maxlength="12000" aria-label="${e(title.slice(0,120))}"></textarea>`;dialog.querySelector('[data-report-sections]').append(field);}
 }catch(error){status('Enregistrement impossible : '+error.message);}});
 dialog.querySelector('[data-report-photos]').addEventListener('change',async event=>{
  if(photosBusy)return;photosBusy=true;draft=read();for(const b of dialog.querySelectorAll('[data-report-save],[data-report-apply],[data-report-print]'))b.disabled=true;
  try{for(const file of [...event.target.files]){if(!active())throw Error('Compte ou dossier changé.');if(draft.photos.length>=4)throw Error('4 photos maximum.');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw Error('Photo JPEG/PNG/WebP requise, 10 Mo maximum.');const bitmap=await createImageBitmap(file);try{if(!active())throw Error('Compte ou dossier changé.');const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const dataUrl=canvas.toDataURL('image/jpeg',.7);if(dataUrl.length>500000)throw Error('Photo trop volumineuse après compression.');draft.photos.push({dataUrl,caption:''});}finally{bitmap.close();}}status('Photos prêtes. Enregistrez le brouillon pour les conserver.');}catch(error){status(error.message);}finally{photos();photosBusy=false;for(const b of dialog.querySelectorAll('[data-report-save],[data-report-apply],[data-report-print]'))b.disabled=false;event.target.value='';}
 });
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);photos();dialog.showModal();
}
