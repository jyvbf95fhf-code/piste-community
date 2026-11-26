import {escapeHTML as e} from './components.mjs';
import {SEARCH_OUTCOMES} from './search-outcome.mjs';

const number=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const n=value=>Number.isFinite(value)?number.format(value):'—';
const label=metric=>metric.unit?`${metric.label} (${metric.unit})`:metric.label;
const path=id=>'/scientific/session/'+encodeURIComponent(id);

function scatter(analysis){
 const {points,xVar,yVar}=analysis;
 if(!points.length)return '<p>Aucune séance ne fournit les deux mesures sélectionnées.</p>';
 const width=640,height=290,left=56,right=18,top=18,bottom=40;
 const extent=key=>{
  let min=Infinity,max=-Infinity;
  for(const point of points){min=Math.min(min,point[key]);max=Math.max(max,point[key]);}
  return min===max?[min-.5,max+.5]:[min,max];
 };
 const [minX,maxX]=extent('x'),[minY,maxY]=extent('y');
 const px=value=>left+(value-minX)/(maxX-minX)*(width-left-right);
 const py=value=>height-bottom-(value-minY)/(maxY-minY)*(height-top-bottom);
 const ticks=Array.from({length:5},(_,i)=>{
  const x=minX+(maxX-minX)*i/4,y=minY+(maxY-minY)*i/4;
  return `<path class="science-grid-line" d="M${px(x)} ${top}V${height-bottom} M${left} ${py(y)}H${width-right}"/><text x="${px(x)}" y="${height-bottom+24}" text-anchor="middle">${n(x)}</text><text x="${left-7}" y="${py(y)}" dominant-baseline="middle" text-anchor="end">${n(y)}</text>`;
 }).join('');
 const dots=points.map(point=>{
  const text=`${point.title} · ${n(point.x)} ${xVar.unit} · ${n(point.y)} ${yVar.unit}`;
  return `<a href="${path(point.id)}" aria-label="${e(text)}"><circle cx="${px(point.x)}" cy="${py(point.y)}" r="6"><title>${e(text)}</title></circle></a>`;
 }).join('');
 return `<svg class="scientific-scatter" viewBox="0 0 ${width} ${height}" role="group" aria-label="Nuage de points des séances">
  ${ticks}${dots}</svg>`;
}

function metricsTable(analysis,synthetic){
 return `<div class="scientific-table-wrap"><table><thead><tr>${['Indicateur','n','Manquants','Médiane','Q1','Q3','Min.','Max.','Moyenne','Origine'].map(title=>`<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${analysis.metrics.map(metric=>{
  const s=metric.summary;
  return `<tr><th scope="row">${e(label(metric))}</th>${[s.n,s.missing,s.median,s.q1,s.q3,s.min,s.max,s.mean].map(value=>`<td>${n(value)}</td>`).join('')}<td>${synthetic?'Jeu synthétique':e(metric.origin)}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}

export function ScientificFilteredCharts(analysis,{axesForm,compareLink,synthetic}){
 if(!analysis.total)return '<section class="scientific-panel"><h2>Aucune séance dans cette sélection</h2><p>Modifiez les filtres pour afficher des statistiques.</p></section>';
 const {total,observations,ages,points,xVar,yVar,outcomes}=analysis;
 const maxAgeCount=Math.max(1,...ages.map(item=>item.count));
 const pairedRows=points.map(point=>`<tr><th scope="row"><a href="${path(point.id)}">${e(point.title)}</a></th><td>${n(point.x)}</td><td>${n(point.y)}</td></tr>`).join('');
 return `<div class="scientific-filtered-charts">
  <section class="scientific-panel">
   <h2>Échantillon filtré</h2>
   <p><strong>${total} séances</strong> · ${analysis.training} entraînements · ${analysis.operational} OPS${synthetic?' · données synthétiques':''}</p>
   <dl class="scientific-dl scientific-analysis-coverage">${[['Trace posée',observations.reference],['Suivi GPS',observations.search],['Âge au départ',observations.age],['Vent à la pose',observations.wind]].map(([name,value])=>`<div><dt>${name}</dt><dd>${value} / ${total}</dd></div>`).join('')}</dl>
  </section>
  <details class="scientific-panel"><summary>Composition par terrain</summary>
   <ul class="scientific-age-bars">${analysis.environments.map(([terrain,count])=>`<li><span>${e(terrain)}</span><meter aria-label="${e(terrain)}" max="${total}" value="${count}"></meter><strong>${count}</strong></li>`).join('')}</ul>
  </details>
  ${synthetic?'':`<details class="scientific-panel"><summary>Résultats de recherche déclarés</summary>
   <p>${outcomes.eligible} recherches renseignées et éligibles · ${outcomes.unreported} sans résultat déclaré · ${outcomes.excluded} hors calcul.</p>
   <dl class="scientific-dl scientific-analysis-coverage">${SEARCH_OUTCOMES.slice(0,4).map(([code,text])=>`<div><dt>${text}</dt><dd>${outcomes.counts[code]}</dd></div>`).join('')}</dl>
   ${outcomes.discoveryRate===null?'':`<p>Découvertes directes ou orientées · ${outcomes.discovered} / ${outcomes.eligible} · ${outcomes.discoveryRate} % des recherches renseignées et éligibles.</p>`}
  </details>`}
  <section class="scientific-panel">
   <h2>Répartition des âges de piste</h2>
   <p>${observations.age} âges renseignés · ${total-observations.age} manquants</p>
   <ul class="scientific-age-bars">${ages.map(({label:band,count})=>`<li><span>${e(band)}</span><meter aria-label="${e(band)}" max="${maxAgeCount}" value="${count}"></meter><strong>${count}</strong></li>`).join('')}</ul>
  </section>
  <section class="scientific-panel">
   <h2>Relation entre deux mesures</h2>
   ${axesForm}
   <p>${points.length} séances avec les deux mesures · ${analysis.missingPairs} exclues de ce graphique pour donnée manquante.</p>
   <figure class="scientific-scatter-figure">
    <figcaption><strong>Vertical</strong> ${e(label(yVar))} · <strong>Horizontal</strong> ${e(label(xVar))}</figcaption>
    ${scatter(analysis)}
   </figure>
   ${analysis.rho===null?`<p>Corrélation indisponible. Choisissez deux indicateurs différents avec au moins trois paires et des valeurs qui varient.</p>`:`<p>Corrélation de rang (Spearman) · <strong>${n(analysis.rho)}</strong> · n = ${points.length}.</p>`}
   ${points.length?`<details><summary>Voir les séances et leurs valeurs</summary><div class="scientific-table-wrap"><table><thead><tr><th scope="col">Séance</th><th scope="col">${e(label(xVar))}</th><th scope="col">${e(label(yVar))}</th></tr></thead><tbody>${pairedRows}</tbody></table></div></details>`:''}
  </section>
  <section class="scientific-panel">
   <h2>Statistiques par indicateur</h2>
   <p>Q1 et Q3 délimitent les 50 % centraux des valeurs disponibles.</p>
   ${metricsTable(analysis,synthetic)}
  </section>
  <section class="scientific-panel">
   <h2>Comparer deux groupes</h2>
   <p>Comparer les pistes de moins d’une heure et de plus de trois heures sur un même terrain, dans la sélection filtrée.</p>
   <a class="button button-dark" href="${compareLink}">Comparer par âge de piste</a>
  </section>
  <details class="scientific-panel"><summary>Comment interpréter ces résultats</summary>
   <p>Chaque indicateur utilise ses valeurs disponibles. Les séances incomplètes peuvent donc différer d’un indicateur à l’autre. Le nuage utilise uniquement les paires complètes.</p>
   <p>La corrélation de rang décrit une association dans la sélection. Le terrain, le binôme, la météo et la manière d’enregistrer la durée peuvent aussi expliquer les écarts. Plusieurs séances d’un même binôme peuvent être liées. Avec peu de séances, quelques observations peuvent fortement modifier la corrélation. Examinez les effectifs et les dossiers avant de tirer une conclusion.</p>
  </details>
 </div>`;
}
