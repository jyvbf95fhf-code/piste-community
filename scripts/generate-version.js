'use strict';
const fs=require('fs');
const sha=process.env.VERCEL_GIT_COMMIT_SHA||process.env.GIT_COMMIT_SHA||'';
const deployment=process.env.VERCEL_DEPLOYMENT_ID||'';
const build=/^[0-9a-f]{7,40}$/i.test(sha)?sha.slice(0,7):deployment||'local';
fs.writeFileSync('version.json',JSON.stringify({version:'10.51.2',build,generatedAt:new Date().toISOString()},null,2)+'\n');
console.log(`version.json generated: 10.51.2 / ${build}`);
