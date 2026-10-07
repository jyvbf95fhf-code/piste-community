import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveProfileRoute} from '../src/profile-routes.mjs';
import {createProfileStore} from '../src/profile-store.mjs';
import {buildProfileSummary} from '../src/profile-model.mjs';
import {createCommunityStore} from '../src/community-store.mjs';
import {createCommunityNotificationStore} from '../src/community-notifications.mjs';
import {createProfileController} from '../src/profile-controller.mjs';
import {ProfileScreen} from '../src/profile-screen.mjs';

test('profile routes resolve the hub and supported settings without shadowing research routes',()=>{
 assert.deepEqual(resolveProfileRoute('/profile'),{type:'home'});
 assert.deepEqual(resolveProfileRoute('/profile/account'),{type:'account'});
 assert.deepEqual(resolveProfileRoute('/profile/dogs'),{type:'dogs'});
 assert.deepEqual(resolveProfileRoute('/profile/premium'),{type:'premium'});
 assert.deepEqual(resolveProfileRoute('/profile/access'),{type:'access'});
 assert.deepEqual(resolveProfileRoute('/profile/notifications'),{type:'notifications'});
 assert.deepEqual(resolveProfileRoute('/profile/preferences'),{type:'preferences'});
 assert.deepEqual(resolveProfileRoute('/profile/about'),{type:'about'});
 assert.equal(resolveProfileRoute('/profile/research'),null);
 assert.equal(resolveProfileRoute('/profile/unknown'),null);
});

test('profile store contains only personal preferences and primary dog in memory',()=>{
 const store=createProfileStore();
 assert.equal(store.snapshot().primary_dog_id,null);
 store.setPrimaryDog('nox');
 store.setPreferences({distance_unit:'m',time_format:'24h'});
 assert.deepEqual(store.snapshot(),{primary_dog_id:'nox',avatar:'initials',preferences:{distance_unit:'m',time_format:'24h',speed_unit:'km/h',theme:'system',map_default:'standard',density:'comfortable',language:'fr'}});
 store.setAvatar('terrain');assert.equal(store.snapshot().avatar,'terrain');
 assert.throws(()=>store.setPreferences({distance_unit:'miles'}),/valeur invalide/i);
});

test('profile summary derives access, dog and scientific state from supplied source stores',()=>{
 const community=createCommunityStore();
 const consent={status:'active',participationEnabled:true,categories:{weather:true,gps_trace:false},opsCategories:{track_age:true}};
 const model=buildProfileSummary({user:{user_id:'owner-sebastien',name:'Sébastien',role:'Conducteur',permissions:{admin:true,research:true}},dogs:[{id:'nox',name:'Nox',sessions:[{},{}]}],primaryDogId:'nox',jumolfAccess:{entitlement_valid:true,entitlement:'admin_grant',origin_label:'Accès accordé par l’administrateur',expires_at:null,jumolf_enabled:false},jumolfState:{jumolf_onboarding_completed:false,consents:{weather:true}},consent,scientificAccess:{authorized:true,role:'scientific_owner'},adminAccess:{allowed:true},communityProfile:community.getProfile(community.viewerId)});
 assert.equal(model.displayName,'Sébastien');
 assert.equal(model.primaryDog.name,'Nox');
 assert.equal(model.dogCount,1);
 assert.equal(model.jumolf.enabled,false);
 assert.equal(model.jumolf.source,'Accès accordé par l’administrateur');
 assert.equal(model.research.status,'Partielle');
 assert.equal(model.research.opsShared,true);
 assert.equal(model.scientific.allowed,true);
 assert.equal(model.admin.allowed,true);
});

test('profile access summaries distinguish Premium, code, Admin grant, non-active and researcher states',()=>{
 const base={user:{user_id:'member',name:'Camille',permissions:{}},dogs:[],consent:{status:'disabled',participationEnabled:false,categories:{weather:false},opsCategories:{track_age:false}}};
 const premium=buildProfileSummary({...base,jumolfAccess:{entitlement_valid:true,entitlement:'premium',origin_label:'Inclus avec Premium',jumolf_enabled:true}});
 assert.equal(premium.premium.active,true);assert.equal(premium.jumolf.enabled,true);
 const code=buildProfileSummary({...base,jumolfAccess:{entitlement_valid:true,entitlement:'access_code',origin_label:'Accès via code',jumolf_enabled:true}});
 assert.equal(code.premium.active,false);assert.equal(code.jumolf.source,'Accès via code');
 const grant=buildProfileSummary({...base,jumolfAccess:{entitlement_valid:true,entitlement:'admin_grant',origin_label:'Accès accordé par l’administrateur',jumolf_enabled:false}});
 assert.equal(grant.jumolf.valid,true);assert.equal(grant.jumolf.enabled,false);
 const standard=buildProfileSummary({...base,scientificAccess:{authorized:false},adminAccess:{allowed:false}});
 assert.equal(standard.scientific.allowed,false);assert.equal(standard.admin.allowed,false);
 const researcher=buildProfileSummary({...base,scientificAccess:{authorized:true,role:'researcher'},adminAccess:{allowed:false}});
 assert.equal(researcher.scientific.allowed,true);assert.equal(researcher.admin.allowed,false);
 const contributor=buildProfileSummary({...base,consent:{participationEnabled:true,categories:{weather:true,gps_trace:false},opsCategories:{track_age:false}}});
 assert.equal(contributor.research.status,'Partielle');
});

test('editing profile name updates the community source and primary dog remains linked to dogs store',()=>{
 const community=createCommunityStore();let currentPath='';
 const profile=createProfileStore();
 const controller=createProfileController({store:profile,communityStore:community,getDogs:()=>[{id:'nox'},{id:'uma'}],navigate:path=>currentPath=path,render(){}});
 assert.equal(controller.submit('account',{displayName:'Sébastien Terrain'}),true);
 assert.equal(community.getProfile(community.viewerId).displayName,'Sébastien Terrain');
 assert.equal(controller.dispatch('set-primary-dog',{dogId:'uma'}),'uma');
 assert.equal(profile.snapshot().primary_dog_id,'uma');
 assert.equal(currentPath,'');
 assert.throws(()=>controller.dispatch('set-primary-dog',{dogId:'missing'}),/chien/i);
});

test('profile notification preferences mutate the existing notification store only',()=>{
 const notifications=createCommunityNotificationStore({viewerId:'self'});
 const community=createCommunityStore({notificationStore:notifications});
 const controller=createProfileController({store:createProfileStore(),communityStore:community,getDogs:()=>[],notificationStore:notifications,render(){}});
 controller.dispatch('set-notification',{key:'notify_live_email',value:true});
 assert.equal(notifications.getPreferences('self').notify_live_email,true);
 assert.equal(notifications.getPreferences('self').notify_live_in_app,true);
});

test('profile screens expose central controls, reuse links and keep account states readable',()=>{
 const profile=createProfileStore();
 const common={user:{user_id:'owner-sebastien',name:'Sébastien',initials:'SL',role:'Conducteur',permissions:{admin:true,research:true}},profileStore:profile,dogs:[{id:'nox',name:'Nox',sessions:[{}]}],communityProfile:{displayName:'Sébastien'},jumolfAccess:{entitlement_valid:false,entitlement:'none',origin_label:'Aucun accès',jumolf_enabled:false},jumolfState:{},consent:{status:'disabled',participationEnabled:false,categories:{},opsCategories:{}},scientificAccess:{authorized:true,role:'scientific_owner'},adminAccess:{allowed:true},notificationPreferences:{notify_live_in_app:true,notify_live_email:false,notify_live_push:false},notifications:{},appVersion:{app_version:'2.0.0-demo',build:'build-demo',environment:'Preview'}};
 const home=ProfileScreen({route:{type:'home'},...common});
 for(const text of ['Mon compte','Mes chiens','Premium &amp; JUMOLF','Mes accès','Confidentialité &amp; recherche','Notifications','Préférences','Aide &amp; À propos','Administration'])assert.match(home,new RegExp(text));
 assert.match(ProfileScreen({route:{type:'account'},...common}),/data-profile-form="account"/);
 assert.match(ProfileScreen({route:{type:'dogs'},...common}),/Gérer mes chiens/);
 assert.match(ProfileScreen({route:{type:'premium'},...common}),/Utiliser un code d’accès/);
 assert.match(ProfileScreen({route:{type:'access'},...common}),/Espace scientifique/);
 assert.match(ProfileScreen({route:{type:'notifications'},...common}),/Disponible prochainement/);
 assert.match(ProfileScreen({route:{type:'preferences'},...common}),/data-profile-preference/);
 assert.match(ProfileScreen({route:{type:'about'},...common}),/Simulation locale/);
 const standard=ProfileScreen({route:{type:'home'},...common,user:{...common.user,user_id:'member-standard-01',permissions:{admin:false,research:false}},adminAccess:{allowed:false},scientificAccess:{authorized:false}});
 assert.doesNotMatch(standard,/Administration|Espace scientifique/);
});
