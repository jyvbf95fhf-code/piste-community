import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const [tokens,styles]=await Promise.all([
 readFile(new URL('../src/tokens.css',import.meta.url),'utf8'),
 readFile(new URL('../src/styles.css',import.meta.url),'utf8'),
]);
const communityTheme=tokens.match(/\.app-shell\[data-module-theme="community"\]:not\(\.notifications-shell\)\s*\{[^}]*\}/s)?.[0]||'';
const communityRules=styles.slice(styles.indexOf('/* Community color pass:'));

test('Community uses an integrated slate palette and keeps its visual treatment scoped',()=>{
 assert.match(communityTheme,/--theme-canvas:\s*#14222f/i);
 assert.match(communityTheme,/--theme-canvas-soft:\s*#1d2c39/i);
 assert.match(communityTheme,/--theme-surface-raised:\s*#2c3f4d/i);
 assert.match(communityTheme,/--theme-text:\s*#edf1f2/i);
 assert.match(communityRules,/\.app-shell:has\(\.community-page\) \.community-page :is\(\.button-subtle,\.button-dark\)\s*\{[^}]*color:\s*#edf1f2[^}]*background:\s*linear-gradient/is);
 assert.match(communityRules,/\.app-shell:has\(\.community-page\)\s*\{\s*width:100%;\s*max-width:none;/s);
 assert.doesNotMatch(communityRules,/\.jumolf-|--jumolf-/i);
 assert.doesNotMatch(communityRules,/(^|\s)(\.card|\.screen|\.panel)\s*\{/i);
});
