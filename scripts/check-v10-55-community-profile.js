'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('app.js');
const html = read('index.html');
const security = read('PISTE_V10.28_BETA_SECURITY.sql');
const ok = (value, message) => assert.ok(value, message);

ok(html.includes('id="displayNameForm"'), 'Community profile form missing');
ok(html.includes('id="displayNameInput"') && html.includes('maxlength="24"'), 'Display name constraints missing');
ok(html.includes('id="saveDisplayNameBtn"') && html.includes('id="displayNameMessage"'), 'Display name feedback controls missing');
ok(app.includes('async function saveDisplayName'), 'Display name save handler missing');
ok(app.includes("String(input.value||'').trim()"), 'Display name must be trimmed');
ok(app.includes("Le nom affiché ne peut pas être vide."), 'Empty display name must be rejected');
ok(app.includes('next.length>24'), 'Display name length guard missing');
ok(app.includes("supabase.from('profiles').update({display_name:next})"), 'Profile display_name update missing');
ok(app.includes(".eq('user_id',session.user.id)"), 'Profile update must be scoped to current user');
ok(!/function saveDisplayName[\s\S]*?supabase\.auth\.updateUser/.test(app), 'Display name must not update Auth identity');
ok(app.includes("button.disabled=true;message.textContent='Enregistrement…'"), 'Double submission/loading state missing');
ok(app.includes("input.value=previous;message.textContent='Impossible d’enregistrer le nom affiché. La valeur précédente est conservée.'"), 'Previous value must be restored after failure');
ok(app.includes("message.textContent='Nom affiché enregistré.'"), 'Success feedback missing');
ok(app.includes("$('profilePseudo').textContent=next") && app.includes("$('helloUser').textContent='Bonjour '+next"), 'Current UI identity must update after save');
ok(app.includes("$('displayNameInput').value=me?.display_name||''"), 'Profile form must load current display name');
ok(/display_name\|\|'Pisteur'/.test(app), 'Safe non-sensitive fallback missing');
ok(/esc\(.*display_name/.test(app), 'Community display names must be escaped in HTML consumers');
ok(security.includes('create policy profiles_update_own'), 'Own-profile update policy missing');
ok(security.includes('using (user_id = (select auth.uid()))'), 'Profile update ownership guard missing');
ok(security.includes('with check (user_id = (select auth.uid()))'), 'Profile update ownership check missing');
ok(!security.includes('profiles_display_name_unique'), 'Display name must not gain an invented uniqueness policy');
ok(app.includes('coachingParticipantName') && app.includes('me?.display_name'), 'Existing Coaching display-name consumer missing');

console.log('v10.55 community profile guard: PASS');
