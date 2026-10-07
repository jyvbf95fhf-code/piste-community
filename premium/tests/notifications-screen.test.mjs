import test from 'node:test';
import assert from 'node:assert/strict';
import {NotificationsScreen,NotificationPreferencesScreen} from '../src/notifications-screen.mjs';
import {createCommunityNotificationStore} from '../src/community-notifications.mjs';

test('notification center renders role-specific Live and social notifications with CTA',()=>{
 const html=NotificationsScreen([{id:'c',type:'live_session_started',session_type:'coaching',owner_display_name:'Alex',route:'/live/coaching/c',read:false},{id:'o',type:'live_session_started',session_type:'ops',owner_display_name:'Léa',route:'/live/ops/o',read:false},{id:'f',type:'follow',actorId:'Camille',read:true}],2);
 assert.match(html,/Alex a démarré une session Live/);assert.match(html,/Observateur/);assert.match(html,/Léa partage un suivi de piste opérationnel/);assert.match(html,/Camille vous suit/);assert.match(html,/\/live\/ops\/o/);
});

test('notification preferences expose editable local in-app, email, and push flags',()=>{
 const store=createCommunityNotificationStore({viewerId:'self'}),html=NotificationPreferencesScreen(store,'self');
 assert.match(html,/data-notification-preference="notify_live_in_app"[^>]*checked/);assert.match(html,/notify_live_email/);assert.match(html,/notify_live_push/);assert.match(html,/aucun email envoyé/);assert.match(html,/aucun Push envoyé/);
});
