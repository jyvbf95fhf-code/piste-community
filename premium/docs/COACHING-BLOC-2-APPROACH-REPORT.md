# Bloc 2 — raccord final préparation / approche / terrain

## Résultat
Le départ connu est une métadonnée normalisée de la référence préparée, jamais une déduction du rôle créateur. Les fixtures GPX, références initiales et tracés mock créés/importés dans /track-builder enregistrent start:{x,y,space:"mock-map"}. Avant ce raccord, les références n’avaient pas de point normalisé : cette normalisation est locale au repère de dessin et ne parse aucun vrai GPX. Aucun GPS réel ni moteur carte.

Le snapshot conserve ce départ depuis la sélection / le Créateur de tracé jusqu’à la session. Les copies imbriquées sont isolées : aucun rendu ou retour de bibliothèque ne peut modifier la référence authoritative. L’approche ne modifie pas la référence ni son départ.

Avec départ connu : session créée → Rejoindre le départ → état arrivé mock explicite → Me déclarer prêt à tracer → ouverture automatique de /coaching/session en grande carte « Prêt à démarrer » → Démarrer la piste → pose active → Terminer la piste → Je suis en place.
Sans départ connu (Terrain direct / Sans tracé préparé, ou référence sans départ valide) : Me déclarer prêt à tracer → grande carte prête → Démarrer la piste. Aucun départ connu inventé à partir du type ou du créateur seul.

Approche : carte de référence, départ, position disponible du Traceur, distance logistique 180 m (fixture) / 0 m à l’arrivée déclarée, cap fictif si position fraîche, Recentrer sur la carte. Distance indisponible si aucune position; ancienneté explicite, cap absent si GPS ancien/acquisition/indisponible. L’arrivée est choisie dans le simulateur DEV « Phase de préparation → Arrivé au départ » ; aucun seuil réel.

Approche ≠ pose : aucun segment de pose/relève, aucun chrono ou distance de piste. Les anciennes couches de test pose/relève sont filtrées dans cette vue logistique Traceur. « Prêt » ne déclenche pas advanceTracer/start : grande carte à 0,00 km, 00:00, aucun segment. Le modèle de pose refuse Démarrer si la préparation n’est pas ready. L’enregistrement commence au départ sélectionné uniquement lors de Démarrer, si la position est disponible. Aucun point de l’approche n’est transféré dans les segments.

Le bouton Ouvrir le terrain mock se trouve exclusivement dans details DEV. Le parcours public utilise le clic Prêt. Après retour volontaire à la préparation, Ouvrir la carte terrain permet de revenir sans réinitialiser la pose. L’expérience Messages, les couches, le HUD et les interruptions segmentées du Bloc 2 sont conservés. La reprise reste dans la même phase, sans raccord artificiel; tous les compteurs restent MOCK, D12 non arbitré.

La règle est identique pour Coach, Conducteur et Traceur créateurs et Solo self_trace. Les autres fonctions gardent leurs écrans/permissions; aucun accès approche/pose pour Observateur ou Traceur externe.

## Fichiers du raccord
Sources :
- premium/src/track-library.mjs : départs normalisés des fixtures / créations / imports mock et copies isolées.
- premium/src/coaching.mjs : conservation de start dans draft, réutilisation et session.
- premium/src/coaching-preparation.mjs : départ connu, phases approche/arrivée, gardes, disponibilité, projection logistique.
- premium/src/coaching-preparation-screen.mjs : informations d’approche et Recentrer, DEV uniquement pour arrivée/entrée terrain manuelle.
- premium/src/app.mjs : ouverture automatique après prêt, recentrage approche, suppression entrée terrain publique.
- premium/src/coaching-tracer.mjs : garde préparation prête, origine des segments liée au départ sélectionné.
- premium/src/coaching-tracer-screen.mjs : prêt à démarrer et bouton désactivé si vue DEV sans préparation prête.
- premium/src/styles.css : cartes logistiques et contrôle flottant scoped.
Tests nouveaux : coaching-approach.test.mjs, coaching-approach-browser-check.mjs.
Tests adaptés au raccord validé : coaching-preparation.test.mjs, coaching-preparation-browser-check.mjs, coaching-tracer.test.mjs, coaching-tracer-browser-check.mjs.
Documentation : ce rapport et ../screenshots/coaching-approach/CAPTURES.md. Preuves : ../screenshots/coaching-approach/.
Les changements Bloc 2 antérieurs non commités sont conservés ; ce document décrit uniquement le raccord ajouté.

## Vérification
npm --prefix premium test : 65/65, dont dix tests nouveaux du raccord. Nouveaux tests observés rouges avant implémentation et deux protections d’isolation observées rouges puis vertes après relecture.
Cinq suites navigateur existantes réussies : globale, création Coaching, Créateur de tracé, Bloc 1 (38 contrôles et 12 combinaisons), Bloc 2 (23 contrôles).
Suite raccord : 18 contrôles, 12 combinaisons type/créateur, Solo, cinq formats terrain et quatre largeurs approche. Onze captures locales iPhone : voir CAPTURES.md.
Vérifications : départ préparé / GPX, absence approche direct / none, arrivée déclarée, ouverture automatique à zéro sans pose, segments séparés après interruption, messages sur carte, recentrage uniquement carte, fonctions successives / Observateur sans action, références stables et copies isolées, aucune position de remplacement. Zéro overflow horizontal, erreur console, requête externe/API ou GPS dans ces suites locales.
Syntaxe des modules modifiés et git diff --check réussis. Relecture indépendante : gardes/raccord/masques corrects ; deux défauts d’isolation du simulateur corrigés et testés (patch combiné arrivée + absence; alias imbriqué du départ).

## Preview privée finale
URL : https://piste-community-v2-premium-jmik59syx-mw2f59b8p2-4030s-projects.vercel.app
Deployment ID : dpl_DTX2M6kkDdLkjFnNidU4ZAHFBtSZ — READY.
Build précompilé : config premium explicite, filesystem avant fallback SPA, exclusions assets/API conservées. 37 fichiers, aucun cache précédent disponible.
SSO all et production inchangés ; aucun bypass créé. Les captures et preuves DOM du raccord sont LOCALES. La Preview protégée nécessite une nouvelle autorisation limitée à cet ID pour toute inspection distante authentifiée.

## Arrêt
Branche feature/v2-premium-prototype, HEAD a237baafec3097e65cf48d813d888b7389d5de7d conservé. Aucun commit, push, merge, tag, production, main/V1, Supabase/SQL/RLS, Auth, Conducteur/relève ou débrief. État final : ../screenshots/coaching-approach/git-status-final.txt.
