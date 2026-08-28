/**
 * PISTE Community V2 — UI shell
 * This layer deliberately does not replace app.js.
 * It reorganizes the existing DOM while preserving IDs and event handlers.
 */
(() => {
  'use strict';

  const q = (sel, root=document) => root.querySelector(sel);
  const qa = (sel, root=document) => [...root.querySelectorAll(sel)];

  function copyPhoto(source, target){
    if(!source || !target) return;
    target.innerHTML = source.innerHTML || '🐕';
    const style = source.getAttribute('style');
    if(style) target.setAttribute('style', style);
    else target.removeAttribute('style');
    target.classList.toggle('has-photo', source.classList.contains('has-photo'));
  }

  function syncDogMirror(){
    const alias = (q('#topDogAlias')?.textContent || '').trim();
    const meta = (q('#topDogAlias')?.dataset?.dogMeta || '').trim();
    const dogName = q('#v2DogName');
    const dogMeta = q('#v2DogMeta');
    if(dogName) dogName.textContent = alias || 'Chien actif';
    if(dogMeta) dogMeta.textContent = alias ? (meta || 'Binôme sélectionné pour le terrain') : 'Sélectionne ton chien depuis le profil';
    copyPhoto(q('#topDogPhoto') || q('#heroDogPhoto'), q('#v2DogPhoto'));
  }

  function privateAuth(){
    const authCard = q('#authScreen .auth-card');

    if(authCard && !q('.v2-private-auth', authCard)){
      const badge = document.createElement('div');
      badge.className = 'v2-private-auth';
      badge.innerHTML = '<span>🛡️</span><span>Bêta privée — inscriptions réservées aux testeurs invités.</span>';
      authCard.insertBefore(badge, authCard.firstChild);
    }
  }

  function buildHome(){
    const home = q('#homePage');
    if(!home || home.dataset.v2Built === '1') return;
    home.dataset.v2Built = '1';
    home.classList.add('v2-home');

    const legacyHero = q('.v8-hero', home);
    const heroBrand = q('.hero-brand', legacyHero);
    const terrainBtn = q('#openTerrainHomeBtn');
    const resume = q('#resumeBanner');
    const activeSession = q('#activeSessionBanner');
    const sync = q('#syncBanner');
    const kpis = q('.v8-kpis', home);
    const modules = q('.module-grid', home);
    const recentCard = q('.v8-card', home);

    const header = document.createElement('section');
    header.className = 'v2-home-header';
    header.innerHTML = '<div class="v2-private-badge">BÊTA • LIVE</div><p class="v2-quote">Terrain, équipe et analyse réunis.</p>';
    if(heroBrand) header.insertBefore(heroBrand, header.firstChild);

    const actionSection = document.createElement('section');
    actionSection.className = 'v2-section';
    actionSection.innerHTML = `
      <div class="v2-action-card coaching-home-card">
        <div class="v2-coaching-art" aria-hidden="true"><span></span><i></i><b></b></div>
        <div class="v2-action-copy">
          <span class="v2-action-icon" aria-hidden="true">⌁</span>
          <div><b>Coaching</b><small>Préparez et suivez une piste avec votre équipe</small><em>Coach · Conducteur · Traceur</em></div>
        </div>
        <div class="v2-coaching-state" aria-live="polite"><span id="homeCoachingState">Chargement du Coaching…</span><small id="homeCoachingStateInfo"></small><button id="homeCoachingStateAction" class="primary" type="button" data-coaching-home-action="open">Ouvrir le Coaching</button></div>
        <div class="v2-coaching-actions"><button id="homeCoachingPrepare" class="secondary" type="button">Préparer</button><button id="homeCoachingJoin" class="secondary" type="button">Rejoindre</button></div>
      </div>
      <div class="v2-action-buttons"></div>`;
    const actionButtons = q('.v2-action-buttons', actionSection);
    const opsBtn = document.createElement('button');
    opsBtn.id = 'homeOpsBtn';opsBtn.className = 'v10-30-quick ops';opsBtn.type = 'button';
    opsBtn.innerHTML = '<span>⚡</span><span><b>OPS</b><small>Appel & opérationnel</small></span>';
    actionButtons.appendChild(opsBtn);
    if(terrainBtn){terrainBtn.classList.add('v10-30-quick','activity');terrainBtn.querySelector('b').textContent='TERRAIN';terrainBtn.querySelector('small').textContent='Libre ou préparé';actionButtons.appendChild(terrainBtn)}

    const dogSection = document.createElement('section');
    dogSection.className = 'v2-section';
    dogSection.innerHTML = `
      <div class="v2-section-title"><h2>Chien actif</h2><span>Binôme terrain</span></div>
      <div class="v2-dog-card">
        <div id="v2DogPhoto" class="v2-dog-photo">🐕</div>
        <div class="v2-dog-copy">
          <small>Profil actif</small>
          <b id="v2DogName">Chien actif</b>
          <span id="v2DogMeta">Prêt pour le terrain</span>
        </div>
        <div class="v2-dog-state">● ACTIF</div>
        <button class="v2-profile-link" data-page="profilePage">Voir la fiche du binôme ›</button>
      </div>`;

    const progressSection = document.createElement('section');
    progressSection.className = 'v2-section';
    progressSection.innerHTML = '<div class="v2-section-title"><h2>Résumé de progression</h2><span>Données réelles</span></div><div class="v2-progress-wrap"></div>';
    if(kpis) q('.v2-progress-wrap', progressSection).appendChild(kpis);

    const recentSection = document.createElement('section');
    recentSection.className = 'v2-section';
    recentSection.innerHTML = '<div class="v2-section-title"><h2>Dernières activités</h2><span>Historique</span></div>';
    if(recentCard){
      recentCard.classList.add('v2-recent-card');
      recentSection.appendChild(recentCard);
    }

    const toolsSection = document.createElement('section');
    toolsSection.className = 'v2-section';
    toolsSection.innerHTML = '<div class="v2-section-title"><h2>Outils</h2><span>Carte, statistiques, amis…</span></div><div class="v2-tools-card"></div>';
    if(modules) q('.v2-tools-card', toolsSection).appendChild(modules);

    home.innerHTML = '';
    home.append(header);
    if(resume) home.append(resume);
    if(activeSession) home.append(activeSession);
    if(sync) home.append(sync);
    home.append(actionSection, dogSection, progressSection, recentSection, toolsSection);

    if(legacyHero) legacyHero.remove();
    syncDogMirror();
    if(typeof window.refreshHomeCoachingCard === 'function') window.refreshHomeCoachingCard();
  }

  function rebuildNav(){
    const nav = q('.bottom-nav');
    if(!nav || nav.dataset.v2Built === '1') return;
    nav.dataset.v2Built = '1';

    const buttons = qa('button', nav);
    if(buttons.length < 5) return;

    const defs = [
      {page:'homePage', icon:'⌂', label:'Accueil'},
      {page:'dogPage', icon:'🐕', label:'Chien'},
      {page:'trainingPage', icon:'◎', label:'Terrain'},
      {page:'feedPage', icon:'🔔', label:'Actualités'},
      {page:'profilePage', icon:'○', label:'Profil'}
    ];

    buttons.forEach((btn, i) => {
      const d = defs[i];
      if(!d) return;
      btn.dataset.page = d.page;
      btn.innerHTML = `<span class="nav-icon">${d.icon}</span><span>${d.label}</span>`;
      if(d.page==='feedPage'){
        btn.classList.add('nav-social');
        btn.insertAdjacentHTML('beforeend','<b id="socialNavBadge" class="nav-notification hidden">0</b>');
      }
    });

    const setActive = (page) => {
      buttons.forEach(b => b.classList.remove('v2-nav-active'));
      const match = buttons.find(b => b.dataset.page === page);
      if(match) match.classList.add('v2-nav-active');
      if(page === 'recordPage' && buttons[2]) buttons[2].classList.add('v2-nav-active');
    };

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-page]');
      if(btn?.dataset?.page) setTimeout(() => setActive(btn.dataset.page), 0);
      if(e.target.closest('#navRecord')) setTimeout(() => setActive('trainingPage'), 0);
    }, true);

    const pages = qa('.page');
    const syncActivePage = () => setActive(q('.page.active')?.id || 'homePage');
    const pageObserver = new MutationObserver(syncActivePage);
    pages.forEach(page => pageObserver.observe(page, {attributes:true, attributeFilter:['class']}));
    syncActivePage();
  }

  function premiumLabels(){
    const title = q('title');
    if(title) title.textContent = 'PISTE Community V2';

    const terrain = q('#openTerrainHomeBtn b');
    if(terrain) terrain.textContent = 'DÉMARRER UNE ACTIVITÉ';
  }

  function monitorDynamicData(){
    const targets = [q('#topDogAlias'), q('#topDogPhoto'), q('#heroDogPhoto')].filter(Boolean);
    if(!targets.length) return;
    const obs = new MutationObserver(syncDogMirror);
    targets.forEach(t => obs.observe(t, {subtree:true, childList:true, attributes:true, characterData:true}));
    setInterval(syncDogMirror, 2500);
  }

  function init(){
    privateAuth();
    premiumLabels();
    buildHome();
    rebuildNav();
    monitorDynamicData();

    document.documentElement.dataset.pisteVersion = '10.30';
    document.body.classList.add('v10-30-aurora');
    console.info('PISTE Community V10.30 UI shell active');
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    setTimeout(init, 0);
  }
})();

/* ==========================================================================
   Coaching Live — architecture préparée, NON ACTIVÉE
   ========================================================================== */
window.PISTE_COACHING = Object.freeze({
  enabled: true,
  version: '10.30',
  roles: ['driver','coach','traceur','observer','solo'],
  capabilities: {
    liveLocation: true,
    liveTrack: true,
    coachMessages: true,
    coachMarkers: true,
    sharedDebrief: true,
    hiddenPreparedRoute: true
  }
});
