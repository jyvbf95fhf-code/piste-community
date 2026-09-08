const fs = require('fs');
const { spawnSync } = require('child_process');

const checks = [
  ...['app.js', 'v2.js', 'sw.js'].map(file => [process.execPath, ['--check', file]]),
  ...fs.readdirSync('scripts').filter(file => /^check-.*\.js$/.test(file)).sort()
    .map(file => [process.execPath, [`scripts/${file}`]]),
  ['git', ['diff', '--check']],
];
const failed = [];
for (const [command, args] of checks) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) failed.push(args.join(' '));
}
console.log(`\n${checks.length - failed.length}/${checks.length} contrôles réussis.`);
if (failed.length) {
  console.error('Échecs :\n' + failed.join('\n'));
  process.exitCode = 1;
}
