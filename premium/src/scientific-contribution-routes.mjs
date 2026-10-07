export function resolveScientificContributionRoute(path='') {
  const route=String(path||'').split('?')[0].replace(/\/+$/,'')||'/';
  if(route==='/profile/research')return {type:'settings'};
  if(route==='/profile/research/data')return {type:'data'};
  if(route==='/profile/research/transparency')return {type:'transparency'};
  return null;
}
