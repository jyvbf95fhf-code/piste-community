import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HeroPanel,ScreenHeader,AppShell} from '../src/components.mjs';
import {AuthScreen,HomeScreen} from '../src/screens.mjs';
import {readFile} from 'node:fs/promises';
test('targeted hero CTA and shared premium dog identity',()=>{
 assert.match(HeroPanel(),/>Piste opérationnelle /);
 assert.match(ScreenHeader('Sébastien'),/premium-brand-dog/);
 assert.match(AuthScreen('/auth/login'),/premium-brand-dog/);
 assert.doesNotMatch(AuthScreen('/auth'),/premium-brand-dog/);
 assert.equal((HomeScreen().match(/class="feature-tile/g)||[]).length,4);
 assert.match(HomeScreen(),/href="\/jumolf"/);
});

test('Home uses the approved image while other headers keep their identity',()=>{
 assert.match(AppShell(HomeScreen(), '/', 'Sébastien', 'SL'), /class="home-welcome-logo"/);
 assert.doesNotMatch(AppShell('', '/sessions', 'Sébastien', 'SL'), /home-welcome-logo/);
 assert.doesNotMatch(ScreenHeader('Sébastien','SL',true),/premium-brand-dog/);
});

test('Home visual theme defines quiet accents and varied surfaces without changing navigation or content',async()=>{
 const tokens=await readFile(new URL('../src/tokens.css',import.meta.url),'utf8');
 const styles=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
 for(const token of ['--home-accent-coaching','--home-accent-operational','--home-accent-dogs','--home-accent-tracks','--home-accent-community','--home-accent-science']) assert.match(tokens,new RegExp(token));
 for(const href of ['/new-session','/tracks','/community','/statistics']) assert.match(styles,new RegExp(`feature-tile\\[href=['\"]${href}['\"]\\]`));
 assert.match(styles,/home-shell \.active-sessions/);
 assert.deepEqual(HomeScreen().match(/href="\/(?:new-session|tracks|community|statistics)"/g),['href="/new-session"','href="/tracks"','href="/community"','href="/statistics"']);
});

test('Home destinations have clearly separated surface themes including a light Community card',async()=>{
 const tokens=await readFile(new URL('../src/tokens.css',import.meta.url),'utf8');
 const styles=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(tokens,/--home-surface-community:#e4e9e2/);
 assert.match(tokens,/--home-surface-coaching:#173846/);
 assert.match(tokens,/--home-surface-tracks:#344956/);
 assert.match(tokens,/--home-surface-analytics:#415564/);
 assert.match(styles,/\.home-shell \.feature-tile\[href='\/community'\][\s\S]{0,220}background:[^;]*--home-surface-community/);
 assert.match(styles,/\.home-shell \.feature-tile\[href='\/new-session'\][\s\S]{0,240}--home-surface-coaching/);
});
