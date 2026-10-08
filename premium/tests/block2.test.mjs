import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HomeScreen, routes } from '../src/screens.mjs';
import { mock } from '../src/data.mjs';
import { canonicalScientificPath } from '../src/scientific-routes.mjs';
test('Auth routes dedicated to entry, login, signup and reset',()=>{
 for(const path of ['/auth','/auth/login','/auth/signup','/auth/forgot']) assert.ok(routes[path],path);
});
test('canonical greeting and permission entries are scoped to mock user',()=>{
 assert.match(HomeScreen(),/Bonjour Sébastien/);
 assert.match(HomeScreen(),/href="\/scientific"/);
 assert.equal(canonicalScientificPath('/research'),'/scientific');
 const standard=HomeScreen({name:'Camille',permissions:{}});
 assert.doesNotMatch(standard,/href="\/(research|admin)"/);
 assert.ok(HomeScreen().indexOf('feature-grid')<HomeScreen().indexOf('twin-card'));
});
test('entry stays free of form fields and signup uses dedicated fields',async()=>{
 const {AuthScreen,PlaceholderScreen}=await import('../src/screens.mjs');
 assert.doesNotMatch(AuthScreen('/auth'),/<input/);
 assert.match(AuthScreen('/auth'),/src="\/src\/assets\/piste-community-accueil-original.jpg"/);
 assert.match(AuthScreen('/auth'),/>Se connecter<\/a>/);
 assert.match(AuthScreen('/auth'),/width="864" height="1536"/);
 assert.doesNotMatch(AuthScreen('/auth'),/auth-manifesto|auth-signature|<header/);
 for(const route of ['login','signup']) assert.match(AuthScreen('/auth'),new RegExp(`href="/auth/${route}"`));
 for(const field of ['firstName','lastName','email','password','confirmPassword']) assert.match(AuthScreen('/auth/signup'),new RegExp(`name="${field}"`));
 assert.match(PlaceholderScreen('/admin',{permissions:{}}),/Espace réservé/);
 assert.doesNotMatch(HomeScreen({name:'<script>',permissions:{}}),/Bonjour <script>/);
});
