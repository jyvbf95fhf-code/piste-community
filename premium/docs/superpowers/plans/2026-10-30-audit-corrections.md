# Corrections audit V2 — exécution séquentielle
Base vérifiée f9e3654. Pas de reconstruction, V1/main/production/SQL/RLS/Auth préservés. Une Preview finale après tests et sauvegarde GitHub.
1. Retour Auth : URL publique bêta stable, assertions sur les requêtes inscription/récupération ; aucun e-mail réel ni réglage Auth.
2. Exports GPX rétrospectifs : tester les segments, horaires absents, provenance ; préparer la dépendance serveur complète depuis les sources actuelles et l’entrée déployée pour préserver push/social.
3. Résultats exports : compléter les annotations personnelles OPS/Coaching dans les sources et CSV, préserver non renseigné et contexte hors calcul, permissions aveugles et consentements.
4. Préférences non raccordées : désactiver explicitement les contrôles indisponibles, garder les valeurs existantes sans promettre un effet ; ne pas introduire traduction ou refonte de thème.
5. Science : persistance locale par compte pour les travaux, écriture atomique avant succès, corruption/quota/concurrence sans écrasement ; démonstration en mémoire, pas de synchronisation promise.
Validation : tests ciblés après chaque point ; suite unitaires/SQL finale et campagnes navigateur pertinentes ; revue du diff. Une mise à jour Edge V2 en phase finale, sans SQL/Auth, puis une Preview Git SHA exact ; comparer sources et vérifier bêta publique avant annonce.

## Vérification avant publication
- 2 586/2 586 tests unitaires/SQL, zéro ignoré, 30/10/2026.
- Navigateur : audit-corrections (préférences 320/390/430, Science reload/isolation/quota), profile-persistence (SDK réel + transport synthétique), data-exports (téléchargements JSON/CSV/GPX), coaching-pose-handoff (3 modes, conflits, reprise sans GPS). Aucun échange physique entre téléphones.
- Manifeste hors connexion vérifié : 321 ressources, 4 162 689 octets.
- Revue indépendante en lecture seule. Point Corpus vérifié : en mode réel app.mjs route /scientific/corpus vers les sessions réelles, pas vers le contrôleur de corpus synthétique en mémoire ; assertion navigateur ajoutée.
- Base Edge lue avant publication : Coaching v26, SHA 370e2e84457404885081e34bb3204aaef42605d5d011b70d711392c4b5fb10fe. Préparation hors ligne : entrée/push/social et services hors exports inchangés ; 52 dépendances d’export lues depuis les sources actuelles, 64 fichiers au total. Aucun secret inclus.
- Le callback public répond HTTP 200. Les requêtes Auth synthétiques ciblent la bêta stable ; essai réel d’e-mail et éventuel ajustement de liste Auth restent distincts et non exécutés.
