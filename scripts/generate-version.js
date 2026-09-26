'use strict';
const fs=require('fs');
const {execFileSync}=require('child_process');
const shaPattern=/^[0-9a-f]{7,40}$/i;
const envSha=process.env.VERCEL_GIT_COMMIT_SHA||process.env.GIT_COMMIT_SHA||'';
let sha=shaPattern.test(envSha)?envSha:'';
if(!sha){try{sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{sha=''}}
const build=shaPattern.test(sha)?sha.slice(0,7):'unknown';
fs.writeFileSync('version.json',JSON.stringify({version:'10.52',build,generatedAt:new Date().toISOString()},null,2)+'\n');
console.log(`version.json generated: 10.52 / ${build}`);
