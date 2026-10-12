# Aide facultative à la création des sessions

Branche : `feature/v2-premium-session-guide`, base validée `cc626dab2edfd8ed97dad349f82a4dce5b2e6b21`.

Design approuvé en conversation : « Comprendre les choix » sous le titre de création, icône d’aide près du titre des étapes, panneau superposé refermable sans perdre les choix. Aucun passage obligatoire ni nouvelle étape.

Périmètre borné : un module d’explication/boîte de dialogue, boutons dans l’écran existant, raccord de clic et nettoyage de la boîte lors du rendu, feuille de styles locale dédiée et tests. Aucun changement du modèle, des permissions, du GPS, du stockage ou du parcours terrain.

Les quatre rubriques reprennent les modes de visibilité, les quatre organisations de pose, les quatre préparations et les fonctions de l’équipe. Self-trace et pose enregistrée par le Conducteur sont indiqués en Normal uniquement. La référence du Coach poseur reste un cas distinct.

Tests-first : 13 nouveaux tests observés rouges puis verts ; tests ciblés Coaching/aide/isolation **34/34** ; régression complète unique après raccord app **1 539/1 539**. Feuille locale dédiée vérifiée ensuite par les 34 tests ciblés, sans modifier les styles existants. `git diff --check` passé. Relecture ciblée du module et des trois raccords ; aucune modification d’une décision métier.

Vérification Preview : en attente du contrôle navigateur. Aucun lien transmis avant cette vérification.

Protections maintenues : main, V1/V10.55, production, Supabase/SQL/RLS/Auth inchangés. Branche conservée pour validation iPhone, aucun merge.
