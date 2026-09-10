# V10.44 — SQL préparé, NON exécuté

## Pourquoi SQL = OUI

Le 10 septembre 2026, audit du dépôt depuis `stable-v10.43` (`0b9d1c9eff6c3b7414e0266627e05a4c53ed26a1`) et des métadonnées Supabase du projet PISTE : 21 tables publiques avec RLS, aucune table Admin/retours parmi les tables listées, aucune RPC Admin utilisable trouvée dans le dépôt. Les métadonnées `auth.users` confirment les colonnes utilisées. Aucun contenu utilisateur n’a été lu pendant cet audit et aucun SQL n’a été exécuté.

Il manque une autorisation Admin persistante, un stockage des retours et des lectures agrégées réservées à l’administration. Les lectures générales depuis le navigateur seraient inacceptables. La migration crée uniquement un schéma privé neuf et quatre RPC ; elle ne modifie aucune table, fonction, policy ou donnée historique Coaching/OPS/Entraînement. Aucune Edge Function.

## Fichiers à appliquer manuellement

1. Copier **tout** `PISTE_V10.44_DRY_RUN.sql` dans Supabase SQL Editor. Il commence par `begin` et finit par **`rollback;`**. Examiner le résultat avant toute suite.
2. Seulement après réussite du DRY RUN, copier **tout** `PISTE_V10.44_APPLY.sql`. Même corps, terminaison **`commit;`**.
3. Les deux fichiers refusent une collision avec le schéma `piste_admin_v1044` : ne pas tenter de réapplication aveugle. Le DRY RUN réussi ne conserve aucun objet.
4. L’APPLY laisse la liste d’administrateurs **vide**. Aucun compte n’est promu par le patch. Avant application manuelle, le bouton Admin est caché et les retours affichent une erreur sans effacer le texte.

Codex n’a effectué aucune de ces opérations. Les parseurs locaux vérifient la grammaire SQL, pas son exécution, ses plans ni les ACL réelles du projet.

## Attribution Admin manuelle après APPLY

L’UUID Admin n’a pas été fourni. Identifier le compte dans Authentication → Users ; vérifier son identité hors de l’application. Un opérateur habilité peut ensuite copier la commande ci-dessous dans SQL Editor en remplaçant le marqueur. **Ne pas copier le marqueur tel quel.** Ni email, ni pseudo, ni métadonnée de profil ne confèrent ce droit.

```sql
insert into piste_admin_v1044.administrators(user_id)
values ('REMPLACER_PAR_UUID_ADMIN'::uuid)
on conflict (user_id) do nothing;
```

Révocation manuelle : supprimer uniquement cette entrée de la table `administrators` via SQL Editor. Cela ne supprime ni le compte ni ses données. Recharger la page après attribution. Chaque lecture/changement de statut vérifie de nouveau l’appartenance : un droit révoqué ne reste pas valide côté serveur.

## Autorisations

- `piste_admin_v1044` : aucun USAGE pour PUBLIC/anon/authenticated, aucun privilège direct sur tables/vues ; RLS activée sur les deux tables, aucune policy ouvrant leur lecture.
- Tables privées : `administrators` et `feedback`. Vues privées : `sessions`, `users`, `events`. Ne pas ajouter ce schéma aux schémas exposés de la Data API.
- Quatre fonctions publiques SECURITY DEFINER avec `search_path=''`. Noms qualifiés, absence de SQL dynamique, `auth.uid()` contrôlé explicitement.
- `piste_admin_access_v1044()` retourne seulement une capacité booléenne pour l’utilisateur courant.
- `piste_admin_query_v1044(...)` vérifie Admin avant les données ; sections/tri/filtres autorisés explicitement ; pages de 50, détails limités à 20 par rubrique. L’Admin lit des métadonnées utiles, sans email, GPS, lieux, titre de mission ni débrief.
- `piste_admin_feedback_status_v1044(...)` vérifie Admin ; seuls statut/révision/horodatage/auteur du changement sont modifiables. La révision attendue empêche l’écrasement concurrent (`40001`).
- `piste_feedback_submit_v1044(...)` exige une connexion ; l’auteur vient exclusivement de `auth.uid()`, le statut initial de la base. Sujet 120 caractères, message 4 000, contexte 80. UUID de requête idempotent, verrou par utilisateur, maximum 5 nouveaux retours/heure. Aucun RPC de lecture des retours pour un utilisateur standard.
- Toutes les fonctions révoquent les droits par défaut, puis accordent uniquement EXECUTE à authenticated. Aucun GRANT SELECT global, TRUNCATE, REFERENCES ou TRIGGER ajouté.
- FK des nouvelles tables vers Auth : les nouveaux retours et droits Admin suivent une suppression de compte existante. Aucun historique existant n’est migré/supprimé.

## Recette de sécurité à réaliser après application manuelle

Utiliser deux sessions réellement distinctes (Admin autorisé / utilisateur standard) et un navigateur anonyme. Ne jamais tester en injectant une clé service_role dans le navigateur.

- Standard : `rpc('piste_admin_access_v1044')` → false ; bouton absent ; `?page=admin` ou `#admin` → Profil sans donnée Admin.
- Standard : appeler directement `piste_admin_query_v1044` pour **chaque** section, avec son propre UUID puis celui d’un tiers pour profile → refus `42501`.
- Standard : appel direct de `piste_admin_feedback_status_v1044` → `42501` ; sélection directe `feedback`/`administrators`/vues privées → refus de schéma/privilège. Ne jamais obtenir les retours d’un tiers.
- Anonyme : aucune fonction exécutable via les privilèges accordés ; aucune table privée lisible.
- Standard : envoyer un retour, réessayer avec le même UUID et le même contenu → un seul retour ; un UUID appartenant à un tiers ne renvoie pas son contenu ; 6e nouvel envoi dans l’heure → refus.
- Admin : accès aux cinq rubriques, recherches/filtres/tri/pages ; profil ; les quatre statuts. Deux fenêtres modifiant la même révision → deuxième modification refusée et rechargée.
- Retirer manuellement le droit Admin de la session de test : prochaine RPC refusée, données Admin effacées de l’écran. Déconnexion : même effacement, aucune réponse tardive réaffichée.
- Comparer les agrégats aux données connues par l’opérateur ; contrôler un compte sans profil/piste, une ancienne piste archivée et un Coaching sans distance consolidée.

Cette recette réelle reste **à faire** ; aucun appel à ces nouvelles fonctions déployées n’est revendiqué avant l’application manuelle.

## Sources et bornes des KPI

Voir `../PISTE_V10.44_TESTS.md` pour la définition de chaque indicateur, notamment actif, distances déclarées partielles et clôtures Coaching uniquement. Les totaux incluent les archives, excluent les enregistrements supprimés et comptent les pistes par créateur, pas par participant. Les filtres d’usage dominant incluent les ex æquo.
