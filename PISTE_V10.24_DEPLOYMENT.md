# PISTE Community V10.24

## Contenu

- créateur de session = Coach ou Solo ;
- rôles Conducteur, Traceur et Observateur à l’entrée par code ;
- tracé par rues, chemins ou segments libres ;
- suggestions recalées automatiquement sur le réseau OpenStreetMap ;
- météo Open-Meteo appliquée au modèle olfactif ;
- suivi GPS suspendu lors d’un zoom ou déplacement manuel, avec bouton Recentrer.

## Déploiement Supabase

1. Exécuter `PISTE_V10.24_COACHING.sql` dans SQL Editor.
2. Créer une clé openrouteservice et l’enregistrer comme secret `ORS_API_KEY`
   depuis Supabase Dashboard → Edge Functions → Secrets (sans l’écrire dans le terminal).
3. Déployer `route-path` avec vérification JWT active :
   `npx supabase functions deploy route-path --project-ref cobekrttsojzwoetyaad`

Ne jamais ajouter `ORS_API_KEY` à `config.js` ou au dépôt.

## Vérifications

- le coach crée la session mais ne peut pas démarrer le GPS du conducteur ;
- le conducteur rejoint par code et voit « Démarrer avec mon chien » ;
- le traceur peut enregistrer la pose ;
- le mode Solo peut préparer et démarrer ;
- le conducteur ne voit pas le tracé masqué ;
- les modes chemins/rues suivent les voies et le mode libre relie directement ;
- la météo reste modifiable manuellement ;
- zoomer pendant un enregistrement affiche Recentrer sans modifier le zoom.
