const fs = require('fs');
const assert = require('assert/strict');

module.exports = function verifyCurrentAssets() {
  const html = fs.readFileSync('index.html', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /^const C='piste-community-v2114';$/m);
  const assets = ['app.js?v=1045-1', 'v2.css?v=2077', 'v2.js?v=2021', 'styles.css?v=1027'];
  assert(html.includes('./admin.css?v=1044-1'));
  assert(fs.readFileSync('app.js','utf8').includes("'./admin.js?v=1044-1'"));
  for (const extra of ['admin.js?v=1044-1','admin.css?v=1044-1']) assert(sw.includes(`'./${extra}'`));
  for (const asset of assets) {
    assert(html.includes(`"./${asset}"`), `Asset HTML absent : ${asset}`);
    assert(sw.includes(`'./${asset}'`), `Asset précaché absent : ${asset}`);
  }
};
