const fs = require('fs');
const assert = require('assert/strict');

module.exports = function verifyCurrentAssets() {
  const html = fs.readFileSync('index.html', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /^const C='piste-community-v2104';$/m);
  const assets = ['app.js?v=1042-16', 'v2.css?v=2070', 'v2.js?v=2018', 'styles.css?v=1027'];
  for (const asset of assets) {
    assert(html.includes(`"./${asset}"`), `Asset HTML absent : ${asset}`);
    assert(sw.includes(`'./${asset}'`), `Asset précaché absent : ${asset}`);
  }
};
