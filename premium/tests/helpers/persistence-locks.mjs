// Test-only implementation of the Web Locks request contract.
export function testPersistenceLocks(){const tails=new Map();return {request(name,options,work){const before=tails.get(name)||Promise.resolve();let release;const done=new Promise(r=>release=r);tails.set(name,done);return before.then(work).finally(release);}};}
