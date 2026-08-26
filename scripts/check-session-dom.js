const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const v2 = fs.readFileSync(path.join(root, 'v2.js'), 'utf8');

const referenced = [...app.matchAll(/\$\(['"]((?:activeSession|coaching)[^'"]*)['"]\)/g)].map(match => match[1]);
const declared = new Set([...html.matchAll(/\bid=['"]([^'"]+)['"]/g)].map(match => match[1]));
const missing = [...new Set(referenced.filter(id => !declared.has(id)))].sort();
const activeBannerPreserved = /q\(['"]#activeSessionBanner['"]\)/.test(v2) && /home\.append\(activeSession\)/.test(v2);

if (missing.length || !activeBannerPreserved) {
  if (missing.length) console.error(`Identifiants de session absents de index.html : ${missing.join(', ')}`);
  if (!activeBannerPreserved) console.error('v2.js ne préserve pas activeSessionBanner pendant la reconstruction de l’accueil.');
  process.exit(1);
}

console.log(`${new Set(referenced).size} identifiants de session vérifiés ; activeSessionBanner est préservé par v2.js.`);
