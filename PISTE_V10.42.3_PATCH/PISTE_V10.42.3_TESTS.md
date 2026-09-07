# PISTE V10.42.3 — Tests

Base obligatoire : `stable-v10.42.2` — `8f4173b65a4978d186aee62ed46a85c4e46e4d06`.

## Automatiques
```bash
node --check app.js
node --check v2.js 2>/dev/null || true
node scripts/check-postgres-sql.js
node scripts/check-session-dom.js
node scripts/check-v10-38.js
node scripts/check-v10-39.js
node scripts/check-v10-40.js
node scripts/check-v10-41.js
node scripts/check-v10-42.js
node scripts/check-v10-42-1.js
node scripts/check-v10-42-2.js
node scripts/check-v10-42-3.js
git diff --check
```

## Seul
- Accueil → Entraînement & Coaching → **Seul**.
- Le moteur Entraînement existant démarre sans régression GPS/sauvegarde.
- Refresh Safari pendant le suivi : aucune donnée perdue.

## À deux
Téléphone A = Traceur, téléphone B = Conducteur • Coach.
- Exactement 2 personnes affichées, jamais 3 rôles comme 3 personnes.
- A pose → Piste prête → B démarre → B termine.
- B peut remplir Retour Conducteur + Analyse Coach.
- Simple/double aveugle : B ne voit jamais une piste interdite malgré sa capacité Coach.
- Résumé équipe, action attendue, synchronisation et états participant sont cohérents.

## En équipe
A = Coach, B = Traceur, C = Conducteur, D = Observateur facultatif.
- Création bloquée s'il n'y a pas exactement 1 Traceur + 1 Conducteur.
- Observateur non bloquant à toutes les étapes.
- États : Invité / Accepté / Connecté / GPS actif / Hors ligne.
- Débrief Coach et Conducteur séparé.

## Robustesse
- double tap sur Piste prête / Démarrer / Terminer ;
- perte réseau puis retour ;
- fermeture/réouverture Safari ;
- refresh sur chaque téléphone ;
- invitation acceptée depuis l'autre téléphone ;
- GPS refusé puis autorisé ;
- aucun doublon `(session_id,user_id)`.

## Sécurité obligatoire
- le Conducteur • Coach du duo reste `role='driver'` côté serveur ;
- `capabilities` ne doit jamais servir à autoriser la lecture de la piste ;
- `get_my_coaching_sessions` conserve la matrice `blind_mode` V10.42.2 ;
- tester `normal`, `simple_blind`, `full_blind` avant merge.
