const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const v2 = fs.readFileSync(path.join(root, 'v2.js'), 'utf8');

const referenced = [...app.matchAll(/\$\(['"]((?:activeSession|coaching)[^'"]*)['"]\)/g)].map(match => match[1]);
const declared = new Set([...html.matchAll(/\bid=['"]([^'"]+)['"]/g)].map(match => match[1]));
const allIds = [...html.matchAll(/\bid=['"]([^'"]+)['"]/g)].map(match => match[1]);
const duplicateIds = [...new Set(allIds.filter((id, index) => allIds.indexOf(id) !== index))].sort();
const missing = [...new Set(referenced.filter(id => !declared.has(id)))].sort();
const activeBannerPreserved = /q\(['"]#activeSessionBanner['"]\)/.test(v2) && /home\.append\(activeSession\)/.test(v2);

if (missing.length || duplicateIds.length || !activeBannerPreserved) {
  if (missing.length) console.error(`Identifiants de session absents de index.html : ${missing.join(', ')}`);
  if (duplicateIds.length) console.error(`Identifiants HTML dupliqués : ${duplicateIds.join(', ')}`);
  if (!activeBannerPreserved) console.error('v2.js ne préserve pas activeSessionBanner pendant la reconstruction de l’accueil.');
  process.exit(1);
}

console.log(`${new Set(referenced).size} identifiants de session vérifiés ; aucun ID HTML dupliqué ; activeSessionBanner est préservé par v2.js.`);
