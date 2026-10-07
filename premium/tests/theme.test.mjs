import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AppShell } from '../src/components.mjs';
import { themeForRoute } from '../src/theme.mjs';

test('maps existing module routes and nested routes to their module theme', () => {
  const routes = new Map([
    ['/','home'],
    ['/new-session','coaching'],
    ['/coaching/session','coaching'],
    ['/qa/coaching','coaching'],
    ['/qa/coaching/scenario','coaching'],
    ['/operational','operational'],
    ['/operational/mission-1/replay','operational'],
    ['/dogs','dogs'],
    ['/dogs/nox/edit','dogs'],
    ['/sessions','sessions'],
    ['/sessions/session-1/replay','sessions'],
    ['/tracks','tracks'],
    ['/tracks/track-1','tracks'],
    ['/track-builder','tracks'],
  ]);
  for (const [route, expectedTheme] of routes) {
    assert.equal(themeForRoute(route), expectedTheme, route);
  }
});

test('reserves future module themes without changing unrelated routes', () => {
  assert.equal(themeForRoute('/community'), 'community');
  assert.equal(themeForRoute('/community/post/1'), 'community');
  assert.equal(themeForRoute('/science'), 'science');
  assert.equal(themeForRoute('/jumolf/report'), 'science');
  assert.equal(themeForRoute('/stats'), 'analytics');
  assert.equal(themeForRoute('/admin/logs'), 'analytics');
  assert.equal(themeForRoute('/live'), 'coaching');
  assert.equal(themeForRoute('/live/coaching/session-1'), 'coaching');
  assert.equal(themeForRoute('/live/ops/mission-1'), 'operational');
  assert.equal(themeForRoute('/notifications'), 'community');
  assert.equal(themeForRoute('/profile'), 'base');
  assert.equal(themeForRoute('/auth/login'), 'base');
  assert.equal(themeForRoute('/sessionship'), 'base');
});

test('semantic defaults alias legacy colors without changing their values', async () => {
  const css = await readFile(new URL('../src/tokens.css', import.meta.url), 'utf8');
  for (const [semantic, legacy] of [
    ['--theme-canvas','--background-nightDeep'],
    ['--theme-canvas-soft','--background-night'],
    ['--theme-surface','--background-surface'],
    ['--theme-surface-raised','--background-surfaceElevated'],
    ['--theme-text','--text-primary'],
    ['--theme-text-muted','--text-secondary'],
    ['--theme-accent','--premium-gold'],
    ['--theme-accent-secondary','--science-cyan'],
  ]) assert.match(css, new RegExp(`${semantic}:var\\(${legacy}\\)`));
  assert.match(css, /--background-nightDeep:#080e17/);
  assert.match(css, /--premium-gold:#e5c17c/);
  assert.match(css, /--science-cyan:#77d9e8/);
});

test('AppShell exposes theme metadata while keeping the existing bottom navigation', () => {
  const html = AppShell('<h1>Sessions</h1>', '/sessions', 'Demo', 'D', 'sessions');
  assert.match(html, /class="app-shell[^\"]*" data-module-theme="sessions"/);
  assert.doesNotMatch(html,/data-jumolf="true"/);
  assert.doesNotMatch(html,/scientific-layout/);
  assert.match(AppShell('<div class="scientific-shell"></div>','/scientific','Demo','D','science'),/scientific-layout/);
  assert.match(AppShell('<div class="jumolf-shell"></div>','/jumolf','Demo','D','science'),/data-jumolf="true"/);
  const nav = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.deepEqual([...nav.matchAll(/<a href="([^\"]+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span><\/a>/g)].map(([,href,label]) => [href,label]), [
    ['/','Accueil'],['/dogs','Chiens'],['/live','Live'],['/sessions','Sessions'],['/profile','Profil'],
  ]);
});
