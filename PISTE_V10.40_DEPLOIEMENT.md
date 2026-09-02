# PISTE V10.40 — Déploiement

Base : V10.39 `64b5e14d5a1a3ff54f54e0b771b0d2727ead0b78`

Branche :
`feature/v10-40-coaching-olfaction-ai`

## Avant toute modification
```bash
git switch main
git pull --ff-only
git status
git log -1 --oneline
git tag --points-at HEAD
```

Créer ensuite la branche dédiée.

## Avant commit
```bash
node scripts/check-v10-40.js
git diff --check
git status --short
git diff --stat
```

Ne pas pousser / fusionner avant revue du diff.

## Preview
Après push de la branche :
- attendre Vercel READY ;
- tester sur iPhone ancien et iPhone testeur ;
- tester au minimum un propriétaire + un Conducteur + un Observateur ;
- tester session waiting puis live ;
- tester fermeture / réouverture de PISTE.

## IA
La vraie génération IA peut être activée avec une Edge Function Supabase.
La clé API ne doit jamais être placée dans `config.js`, `app.js` ou le navigateur.
Utiliser un secret Supabase côté serveur.
