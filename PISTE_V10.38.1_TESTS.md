# PISTE Community V10.38.1 — tests Coaching invité

## Objectif

Vérifier que la carte Coaching reste visible pour un participant invité avant et après le démarrage, sans révéler les données protégées du double aveugle.

## Scénarios obligatoires

1. L’organisateur crée une session et invite un ami comme observateur. L’ami accepte avant le départ : la carte est visible dans la salle d’attente puis reste visible au démarrage sans rouvrir la session.
2. Refaire le test avec les rôles coach et conducteur.
3. En mode partagé, le coach et l’observateur voient le tracé prévu selon leurs droits.
4. En mode double aveugle, le conducteur voit le fond de carte et le départ autorisé, mais jamais le tracé complet, les indices ou le couloir caché avant la fin.
5. Inverser les deux téléphones : chaque compte doit fonctionner comme organisateur puis comme invité.
6. Ouvrir l’invitation avant le départ, après le départ, puis reprendre une session déjà active.
7. Vérifier le passage En attente vers En direct, le recentrage et le bouton plein écran.
8. Tester sur ancien iPhone, ancien Safari, faible luminosité et après mise en arrière-plan de l’application.

## Contrôles techniques

```sh
node --check app.js
node --check v2.js
node --check sw.js
node scripts/check-v10-38.js
node scripts/check-v10-38-1.js
node scripts/check-session-dom.js
git diff --check
```

Aucun SQL ni aucune Edge Function n’est nécessaire pour ce correctif.
