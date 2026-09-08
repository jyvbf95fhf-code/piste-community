# PISTE V10.42.3 — validation de la refonte Coaching finale

Ce document suit la refonte par personnes, rôles et visibilité décrite dans le README et la PR #36. Les modes de création Seul / À deux / En équipe sont archivés ; Entraînement conserve son moteur individuel.

## Vérifications automatiques

```bash
node scripts/run-checks.js
```

20 contrôles : syntaxe app.js, v2.js et sw.js, tous les scripts check-*.js et git diff --check. Le lanceur continue après un échec et termine avec un code non nul si nécessaire. Les SQL sont analysés, jamais exécutés. Les scripts historiques contrôlent les assets actuels, les accès Terrain actuels et l'absence de rendu de trace Coach/Observateur.

Résultat du 8 septembre 2026 : 20/20 ; 452 IDs HTML uniques ; cas A–S et quatre doubles clics asynchrones réussis. Ces contrôles locaux ne prouvent pas les droits de la base distante.

## Validation manuelle avant merge

- Création avec créateur Coach, Traceur puis Conducteur ; exactement un Traceur et un Conducteur, au maximum un Coach. Refuser doublons, amis non acceptés et compositions invalides, sans session partielle.
- Départ visible au Conducteur dès la préparation. Traceur : Je démarre la piste → Piste tracée. Conducteur : Démarrer → Fin de parcours → Débrief. Observateurs non bloquants.
- Prévisualisation GPS sans trace ni chrono ; Coach sans trace personnelle ; Observateur sans émission GPS. Prévu, GPS Traceur et GPS Conducteur restent séparés.
- Normal : couches partagées. Simple aveugle : Conducteur limité au départ et à sa propre trace. Double aveugle : Coach/Observateur voient le Conducteur, aucun prévu, trace ni position Traceur. Révélation après fin du parcours.
- Tester ces droits avec plusieurs comptes et requêtes directes après application manuelle du SQL VISIBILITY ; tester invitations en attente et rôles immuables.
- Double tap sur chacune des quatre transitions, perte réseau/retour, GPS refusé/autorisé, refresh et fermeture/réouverture Safari à chaque phase ; invitation acceptée depuis un autre téléphone.
- Vérifier contributions Conducteur/Coach, replay et outils de débrief, sessions historiques duo/team, Entraînement individuel et absence de régression OPS GPS/sauvegarde.

SQL VISIBILITY requis pour les nouvelles sessions, préparé mais non exécuté par cette reprise. Ne pas réappliquer les archives CAPABILITIES/APPLY.py. Aucun merge ni tag avant validation iPhone.
