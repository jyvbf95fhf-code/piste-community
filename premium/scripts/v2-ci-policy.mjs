// Restrict the consolidated campaign to V2 update and release branches.
export function isV2CiBranch(branch='') {
 return ['develop/v2-premium','release/v2-production'].includes(branch)||/^fix\/v2-.+/.test(branch)||/^feature\/v2-premium-stabilisation-.+/.test(branch);
}
