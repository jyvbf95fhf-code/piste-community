# Aide facultative à la création des sessions

Branche : `feature/v2-premium-session-guide`, base validée `cc626dab2edfd8ed97dad349f82a4dce5b2e6b21`.

Design approuvé en conversation : « Comprendre les choix » sous le titre de création, icône d’aide près du titre des étapes, panneau superposé refermable sans perdre les choix. Aucun passage obligatoire ni nouvelle étape.

Périmètre borné : un module d’explication/boîte de dialogue, boutons dans l’écran existant, raccord de clic et nettoyage de la boîte lors du rendu, feuille de styles locale dédiée et tests. Aucun changement du modèle, des permissions, du GPS, du stockage ou du parcours terrain.

Les quatre rubriques reprennent les modes de visibilité, les quatre organisations de pose, les quatre préparations et les fonctions de l’équipe. Self-trace et pose enregistrée par le Conducteur sont indiqués en Normal uniquement. La référence du Coach poseur reste un cas distinct.

Tests-first : 13 nouveaux tests observés rouges puis verts ; tests ciblés Coaching/aide/isolation **34/34** ; régression complète unique après raccord app **1 539/1 539**. Feuille locale dédiée vérifiée ensuite par les 34 tests ciblés, sans modifier les styles existants. `git diff --check` passé. Relecture ciblée du module et des trois raccords ; aucune modification d’une décision métier.

Preview staging protégée READY : `dpl_Go62MN3ipFjQWZdvkFWFguNP6u1Q`, commit applicatif `b74e65d3ae7fda4e6b4839868b08f0978665afff`. Arbre GitHub identique au code testé, vérifié après publication.

Contrôles navigateur effectués : bouton discret sous le titre de création, panneau fermé par défaut ; quatre rubriques et trois cartes de modes Premium, styles chargés, aucun débordement horizontal du panneau. Fermeture par bouton de retour, croix et Escape ; mode Double aveugle et Coach sélectionné conservés après consultation. L’icône d’organisation ouvre directement la rubrique pose ; le parcours se poursuit jusqu’au récapitulatif sans nouvelle étape ni obstacle. Aucune erreur applicative détectée. L’accès par lien temporaire de sept jours fonctionne ; protection Vercel maintenue.

Le contrôle navigateur a d’abord subi une expiration du service d’automatisation, puis a été repris avec succès, sans répéter les tests déjà passés. Vérification desktop, pas de test iPhone automatisé ; validation iPhone utilisateur attendue. Rapport publié après vérification sans changement applicatif supplémentaire.

Protections maintenues : main, V1/V10.55, production, Supabase/SQL/RLS/Auth inchangés. Branche conservée pour validation iPhone, aucun merge.
