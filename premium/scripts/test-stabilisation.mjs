// Reproducible, offline regression gate. Never calls real account services.
import {readdirSync,mkdtempSync,readFileSync,writeFileSync,openSync,closeSync,existsSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));process.chdir(root);
const mode=process.argv[2]||'all';if(!['all','--unit','--browser'].includes(mode))throw Error('Usage: node scripts/test-stabilisation.mjs [--unit|--browser]');
if(process.env.GITHUB_ACTIONS){const branch=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||'';if(!branch.startsWith('feature/v2-premium-stabilisation-'))throw Error('La campagne CI est réservée aux branches V2 consolidées.');execFileSync('git',['merge-base','--is-ancestor','c06b3ebcf3e78484782a32f1a1c6fea20a60419b','HEAD']);}
const directory=mkdtempSync(path.join(tmpdir(),'piste-stabilisation-')),runs=[];
function run(name,args,env={}){const started=Date.now(),log=path.join(directory,name+'.log'),fd=openSync(log,'w');let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,...env},stdio:['ignore',fd,fd],timeout:240000});}finally{closeSync(fd);}const output=readFileSync(log,'utf8');const row={name,exitCode:result.status??1,durationMs:Date.now()-started,log};for(const key of ['tests','pass','fail','skipped']){const match=output.match(new RegExp('ℹ '+key+' (\\d+)'));if(match)row[key]=Number(match[1]);}runs.push(row);writeFileSync(path.join(directory,'summary.json'),JSON.stringify({runs},null,2));process.stdout.write(output.split('\n').slice(-12).join('\n')+'\n');console.log(JSON.stringify(row));if(result.error||row.exitCode!==0){console.error('Regression gate failed; full output: '+log);process.exit(row.exitCode||1);}}
if(mode!=='--browser')run('unit-sql',['--test','--test-concurrency=2',...readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'tests/'+f)]);
if(mode!=='--unit'){
 let executable=process.env.PISTE_CHROMIUM_PATH;if(!executable){const {default:chromium}=await import('@sparticuz/chromium');executable=await chromium.executablePath();}if(!existsSync(executable))throw Error('Chromium unavailable: set PISTE_CHROMIUM_PATH.');
 const browserTests=['stabilisation-gps','mes-pistes','piste-bulk','jumolf-preferences','ops-live-3bc','coaching-invitations','social-live','tracer-iphone','account-test-data-reset','lobo-account','home-trail','report-editor','offline-shell'];
 for(const test of browserTests)run(test,['tests/'+test+'.browser.mjs'],{PISTE_CHROMIUM_PATH:executable,QUICK:test==='tracer-iphone'?'':'1'});
}
console.log(JSON.stringify({status:'PASS',runs:runs.length,report:path.join(directory,'summary.json')}));
