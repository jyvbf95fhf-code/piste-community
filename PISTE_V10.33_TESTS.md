# PISTE Community V10.33 — Coaching accueil

## Carte Coaching

- [ ] État normal sans session : « Préparer ou rejoindre une session », puis Ouvrir le Coaching.
- [ ] Session active réelle : nom, rôle et bouton « Reprendre la session » ouvrent la session existante sans GPS automatique.
- [ ] Invitation réelle : rôle proposé et « Voir l’invitation » ouvrent la bonne session.
- [ ] Brouillon réel `publication_status=draft` : « Débrief à finaliser » et reprise du bon débrief.
- [ ] Débrief publié/finalisé ou session terminée seule : aucun faux raccourci de brouillon.
- [ ] Absence de données et erreur de chargement : carte utilisable, sans donnée fictive ni blocage de l’accueil.
- [ ] Changement de compte : aucun état Coaching du compte précédent n’est conservé.

## Navigation et mobile

- [ ] Ouvrir le Coaching, Préparer et Rejoindre utilisent les parcours existants.
- [ ] Retour depuis Coaching restaure l’accueil ; aucune page n’est empilée et aucun `scrollIntoView` ne simule une navigation.
- [ ] Test portrait sur petit iPhone : carte lisible, boutons accessibles, défilement normal et cache actualisé.

## Non-régression

- [ ] Authentification, Actualités, OPS, Entraînement, Tracé et Statistiques inchangés.
- [ ] GPS, écran noir, Me suivre, carte Leaflet et débrief existants fonctionnent.
- [ ] Aucun SQL, Push, Edge Function ou notification externe n’est requis pour cette version.
