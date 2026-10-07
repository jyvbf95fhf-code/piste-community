import test from 'node:test';
import assert from 'node:assert/strict';
import {CommunityScreen} from '../src/community-screen.mjs';
import {createCommunityStore} from '../src/community-store.mjs';
import {createDogsStore} from '../src/dogs.mjs';

const dogs=createDogsStore().list();
const page=(route,options={})=>CommunityScreen({route,store:options.store||createCommunityStore(),dogs,tracks:options.tracks||[],source:options.source||null,query:options.query||''});

test('feed presents usable post cards and a direct Contacts entry',()=>{
  const html=page({type:'feed'});
  assert.match(html,/data-community-route="feed"/);
  assert.match(html,/Communauté/);
  assert.match(html,/href="\/community\/contacts"[^>]*>Contacts/);
  assert.match(html,/Travail de lecture en lisière/);
  assert.match(html,/J’aime/);
  assert.match(html,/Communauté|Contacts/);
});

test('the owner profile edits its visible name and links dog data without cloning it',()=>{
  const html=page({type:'profile',id:'self'});
  assert.match(html,/data-community-form="profile"/);
  assert.match(html,/name="displayName"/);
  assert.match(html,/href="\/community\/contacts"/);
  assert.match(html,/Nox/);
  assert.doesNotMatch(html,/data-community-action="follow"/);
  assert.doesNotMatch(html,/data-community-action="contact-request"/);
});

test('another profile separates Follow from Contact request state and hides inaccessible posts',()=>{
  const html=page({type:'profile',id:'camille'});
  assert.match(html,/Camille Dumas/);
  assert.match(html,/data-community-action="unfollow"/);
  assert.match(html,/Demande envoyée/);
  assert.doesNotMatch(html,/Note privée de préparation/);
  assert.doesNotMatch(html,/Retour terrain réservé aux contacts/);
});

test('Contacts screen exposes received, sent, accepted and suggestion actions',()=>{
  const html=page({type:'contacts'});
  for(const title of ['Mes contacts','Demandes reçues','Demandes envoyées','Suggestions'])assert.ok(html.includes(title),title);
  assert.match(html,/data-community-action="accept-contact"/);
  assert.match(html,/data-community-action="refuse-contact"/);
  assert.match(html,/data-community-action="cancel-contact"/);
});

test('Contacts screen puts an add-contact search CTA before all relationship sections',()=>{
 const html=page({type:'contacts'},{query:'Alex'});
 const cta=html.indexOf('+ Ajouter un contact');
 assert.ok(cta>=0);
 for(const section of ['Mes contacts','Demandes reçues','Demandes envoyées','Suggestions'])assert.ok(cta<html.indexOf(section),section);
 assert.match(html,/data-community-form="contact-search"/);
 assert.match(html,/Alex Martin/);
 assert.match(html,/Conducteur cynophile/);
});

test('accepted Contact card exposes the independent Live authorization control and copy',()=>{
 const store=createCommunityStore({contacts:[{userIds:['self','alex']}],contactRequests:[],follows:[],notifications:[]});
 const html=page({type:'contacts'},{store});
 assert.match(html,/Autoriser l’accès Live/);
 assert.match(html,/Ce contact pourra voir vos sessions que vous choisissez de partager en Live/);
 assert.match(html,/data-community-permission="live_access_authorized"/);
});

test('composer defaults to private with no source fields selected and explicit confirmation',()=>{
  const source={type:'session',id:'session-1',label:'Session terminée · Nox',availableFields:['dog','distance','trackAge'],data:{dog:{id:'nox',name:'Nox'},distance:'850 m',trackAge:'00:12:00'}};
  const html=page({type:'new'},{source});
  assert.match(html,/Session terminée · Nox/);
  assert.match(html,/data-community-form="post-create"/);
  assert.match(html,/value="private" checked/);
  assert.match(html,/name="shareFields" value="dog"/);
  assert.doesNotMatch(html,/name="shareFields" value="dog" checked/);
  assert.match(html,/APERÇU/);
  assert.match(html,/Prévisualiser et continuer/);
  assert.match(html,/Confirmer la publication/);
});

test('shared post view only shows the explicit projection and is read-only',()=>{
  const store=createCommunityStore();
  const created=store.createPost({text:'Une trace',visibility:'community',source:{type:'track',id:'track-clairiere',data:{distance:'400 m',provenance:'Préparé manuellement',points:[{x:30,y:30},{x:90,y:70}],hidden:'secret'},fields:['distance','provenance','points']}});
  const html=page({type:'post',id:created.id},{store});
  assert.match(html,/400 m/);
  assert.match(html,/Préparé manuellement/);
  assert.match(html,/Lecture seule/);
  assert.doesNotMatch(html,/secret/);
  assert.match(html,/Partager la publication/);
  assert.match(html,/Partager la piste/);
});

test('a user cannot render a private post owned by somebody else',()=>{
  const store=createCommunityStore({viewerId:'lea'});
  const html=page({type:'post',id:'post-camille-private'},{store});
  assert.match(html,/Publication indisponible/);
  assert.doesNotMatch(html,/Note privée de préparation/);
});

test('search shows matching profile and track result types with visible relation actions',()=>{
  const html=page({type:'search'},{query:'Alex'});
  assert.match(html,/Alex Martin/);
  assert.match(html,/data-community-result="profile"/);
  const trackHtml=page({type:'search'},{query:'trace'});
  assert.match(trackHtml,/data-community-result="track"/);
});
