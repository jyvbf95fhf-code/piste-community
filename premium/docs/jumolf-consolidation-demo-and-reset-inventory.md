# Lot F — démonstration et périmètre d’inventaire

## Démonstration isolée

`buildJumolfDemoEnvironment()` crée en mémoire Naya, berger belge fictif de 4 ans, et exactement 40 entraînements fictifs du 1er mai au 26 août 2026. Les quatre contextes alternent terrains, modes de visibilité, conducteurs, âge de piste, météo et vent. Les traces, distances, durées, ruptures et reprises varient sans progression monotone imposée. Certaines séances n’ont ni GPS, ni référence, ni journal, ni durée active, ni météo ou âge de piste. Journal complet vide = zéro ; journal absent = inconnu.

Les entrées `buildJumolfDemoProfile` et `buildJumolfDemoLearning` partagent les calculs descriptifs des lots A/B, les comparateurs et protocoles existants. Elles exigent origine `demo`, marqueurs `synthetic` et `demo`, identifiant `rex-demo:history:*`, séance Coaching archivée et association explicite au chien. Les portes publiques du compte continuent à rejeter ces données. Aucun objet n’est présenté au moteur réel comme une donnée de compte. Le préfixe appartient à la famille historique du démonstrateur Rex ; le chien Naya et ses données restent distincts de Rex.

`JumolfDemoHistoryScreen(path)` présente graphiques avec coupures pour valeurs manquantes, tableau des sources, détail par séance, comparaisons et exercices suggérés avec justificatifs. `JumolfDemoHistoryEntry()` expose le lien `/jumolf/demo-history`. Navigation par paramètres `metric` et `session`, sans formulaire, contrôleur de préparation, écriture réseau ou stockage. Rex et ses dix étapes restent conservés.

L’écran ne crée aucun chien, tracé, entraînement ou mémoire pédagogique dans le compte. Aucun exercice n’est déclaré réalisé. La démonstration se reconstruit à chaque appel ; les changements d’un appelant ne contaminent pas le suivant.

## Cartographie des mécanismes de persistance (lecture du code)

Cette première cartographie provient du dépôt. L’inventaire cloud réel effectué ensuite en lecture seule figure à la fin du document et prime sur les réserves initiales concernant le compte distant. Le stockage Safari personnel reste non observé. Les clés ci-dessous sont des modèles, pas des identifiants locaux effectivement trouvés. La présence d’une migration dans le dépôt seule ne prouve pas son application distante.

`OWNER` désigne l’UUID du compte vérifié. `ENC(OWNER)` désigne son encodage par `encodeURIComponent`. Chaque inventaire doit préciser l’origine web, le navigateur/profil et l’appareil : le stockage d’un appareil ne couvre pas les autres appareils.

| Catégorie | Persistance locale repérée | Identifiants à relever avant toute demande de réinitialisation |
| --- | --- | --- |
| Chiens personnels | localStorage `piste-v2-dogs:ENC(OWNER)` | ownerId, chaque dog.id, nom, dépendances sessions/tracés |
| Tracés préparés personnels | localStorage `piste-v2-prepared-tracks:ENC(OWNER)` ; seuls les tracés `ownerId=self` sont persistés | chaque track.id, provenance, association chien, copie personnelle ou source partagée |
| Profil/préférences | `piste-v2-profile:ENC(OWNER)` ; `piste-v2-jumolf-preferences:ENC(OWNER)` | clé, version, ownerId ; distinguer réglages et historique |
| Coaching local en cours/préparé | `piste.v2.coaching-preparation.v1:ENC(OWNER)` | session.id, phase, dogId, état récupérable, géométries et mémoire pédagogique incluses |
| Coaching local terminé | `piste.v2.coaching-history.v1:ENC(OWNER)` | chaque session.id, statut, dogId, date, données GPS/événements |
| Associations Coaching partagé/chien et brouillon pédagogique | `piste-v2-session-dogs:ENC(OWNER)` | chaque ID de session partagé, dogId associé, trainingDraft et ownerId |
| OPS locales et GPS | `piste-v2-ops-gps:OWNER` | mission.id, ownerUserId/gpsOwnerId, statut, GPS, événements, dossier |
| OPS restaurées du cloud | `piste-v2-ops-cloud:OWNER` | mission.id, identifiant cloud, ownerUserId, marqueur cloudReadOnly |
| OPS Live file locale historique | `piste-v2-ops-live-3a:` + JSON.stringify([OWNER, missionId]) | missionId, IDs des éléments en attente/confirmés |
| OPS Live publications locales | `piste-v2-ops-live-remote:OWNER` | mission locale, publication distante, génération/version, séquences, commandes en attente |
| OPS Live identités et permissions locales | `piste-v2-ops-live-identities:OWNER` | alias, UUID utilisateur associé, enabled ; pas de suppression implicite de relations |
| OPS météo par lieu | `piste-v2-ops-place-weather:` + ENC(JSON.stringify([OWNER, missionId])) | missionId, clé, provenance ; données auxiliaires, pas séances indépendantes |
| File Coaching partagé | IndexedDB `piste-coaching-remote-v1`, store `queues`, clé JSON.stringify([OWNER, sessionId]) | compte, sessionId, IDs des commandes GPS/action en attente |
| Journal de synchronisation personnelle | IndexedDB `piste-v2-persistence-v1`, stores `records`, `commands`, `identities`, clé JSON.stringify(['owner', OWNER]) | installationId, kind, localId, UUID distant, revision, commandId, conflits et commandes en attente |
| Sélection temporaire Coaching partagé | sessionStorage `piste.remote.session` | sessionId ; pointeur de navigation, pas l’historique |

Autres caches météo/cartographiques éventuels ne constituent pas une source de chien ou de séance. Les données d’authentification ne sont pas un historique à réinitialiser et ne doivent pas être incluses dans une remise à zéro de contenu.

| Catégorie distante identifiée dans le code | Sélection et identifiants à relever en lecture seule |
| --- | --- |
| Sauvegardes personnelles | `v2_personal_records` : owner_id=OWNER, puis kind (`profile`, `dog`, `track`, `ops`, `session-dog-link`), id, revision, deleted_at. Relever tous les curseurs ; les résultats sont paginés. `v2_personal_commands` : owner_id et command_id pour déterminer les dépendances/idempotences, sans exposer les contenus sensibles. |
| Coaching partagé | `coaching_remote_sessions` : id, owner_id, version, phase et membres dans state. Distinguer sessions possédées de celles où OWNER participe. Les 30 dernières sessions de l’API ne garantissent pas l’exhaustivité. |
| Dépendances Coaching partagé | `coaching_remote_commands` (session_id, command_id, actor_id), `coaching_remote_invites` (session_id, rôle, recipient_id/consumed_by et expiration ; ne pas afficher les jetons), `coaching_remote_batches` (session_id, actor_id, batch_id, kind), `coaching_remote_points` (session_id, actor_id, kind, sequence). Les sources d’autrui partagées avec le compte ne sont pas ses sauvegardes personnelles. |
| OPS Live | Si schéma présent : `ops_live_publications` (id, owner_id, local_mission_id, generation, version, statut partage/fermeture) ; `ops_live_access` (id, owner_id, user_id, scope, publication_id, generation) ; `ops_live_invites` (owner_id, recipient_id, publication_id, scope, expiration/révocation, sans jeton) ; `ops_live_commands` (publication_id, command_id, actor_id, generation) ; `ops_live_points` (publication_id, generation, sequence, batch_id). |
| Sources dérivées partagées | Les tracés `shared:<sessionId>:pose/search` et projections Coaching/OPS sont dérivés des sources ci-dessus ; les dénombrer séparément évite de compter deux fois un entraînement. Une copie personnelle de tracé est en revanche un objet distinct. |

## Contenu nécessaire à une approbation de remise à zéro

Une demande concrète doit présenter : UUID propriétaire vérifié, projet/environnement et origine web vérifiés, catégories choisies, liste des IDs et nombre observé par catégorie, appareil(s) inspecté(s), sources locales/cloud et partagées distinguées, dépendances explicites, conflits et synchronisations en attente, conservation des sources d’autrui et du compte Auth. Indiquer expressément les catégories ou appareils non inspectés. Expliquer la portée réelle de l’action proposée et le moyen de retour arrière disponible. Aucun bouton ni mécanisme de suppression n’est ajouté dans ce lot et aucune suppression réelle n’a été exécutée.

## Vérification

Tests fonctionnels : isolation des origines A/B, 40 dates et identifiants uniques, variété des contextes, valeurs manquantes et zéros justifiés, distances/événements calculés depuis la source, recommandations avec séances justificatives, groupes comparables et non comparables, navigation écran et absence d’actions d’écriture. Tests existants A/B et Rex conservés.


## Inventaire cloud réel en lecture seule — 21 octobre 2026

Projet V2 `shnwqdkiapgcftbnhilh`. Compte propriétaire vérifié par le rôle serveur `owner_admin` : Sébastien (`seb.lobstein@gmail.com`), identifiant `eeca6271-b459-443b-8c2f-46ce20215c8a`. Aucun autre compte sélectionné pour une réinitialisation.

- `v2_personal_records` de ce propriétaire : **0 ligne**, y compris lignes supprimées logiquement. Cela ne prouve pas l’absence de chiens/tracés locaux dans Safari.
- Coaching : **12 séances possédées**, **92 points GPS**, **114 commandes** ; aucune séance appartenant à un autre organisateur trouvée parmi les appartenances de ce compte.
- **4 séances partagées** : leur suppression affecterait les autres participants ; exclues de toute suppression sans examen et accord spécifiques.
- Invitations relatives à ces séances : **13 lignes**, dont **6 consommées. Aucun jeton ni secret exporté.
- Publications Live OPS du propriétaire : **0 ligne**. Aucun fonctionnement Live OPS modifié.

| ID de séance | Chien enregistré dans la séance | État | Participants | Points GPS | Commandes |
|---|---|---|---:|---:|---:|
| 08c6e55d-555d-4b88-bed3-2ff7314f8ba1 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | DEBRIEF | 2 | 16 | 17 |
| 8afecea2-0d01-472b-a6eb-20c0e3f3af83 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | INTERRUPTED | 2 | 4 | 13 |
| 116d8a4b-cc37-45eb-bb20-5f0699eb37e2 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | DEBRIEF | 2 | 17 | 20 |
| ea87f5c0-361d-4bf7-91b6-41006cf437f5 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | PREPARATION | 1 | 0 | 1 |
| 5109e6ae-08f7-45f6-82cc-57e023af1ac3 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | PREPARATION | 1 | 0 | 2 |
| f48d3928-f641-4713-a527-e276319b48cb | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | CANCELLED | 1 | 0 | 3 |
| 75d83ae8-50ff-4662-96e7-6ffb6d9fae35 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | ARCHIVED | 4 | 36 | 22 |
| dd8c6829-0a43-40fc-8d38-5d0c6fc42bc5 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | ARCHIVED | 1 | 5 | 11 |
| 9966b15b-6cce-4441-9fe7-213b8f704998 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | ARCHIVED | 1 | 3 | 7 |
| 88ccd9e9-6a53-4f14-8964-ef1a77da07a8 | Arko (identité `remote-dog`, pas une association canine personnelle démontrée) | ARCHIVED | 1 | 4 | 7 |
| bb81dc37-c7eb-4a2c-9e3a-626831443d7d | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | INTERRUPTED | 1 | 7 | 9 |
| 0fc21dec-b584-4ada-ad85-4d1614e13c73 | Nox (identité `remote-dog`, pas une association canine personnelle démontrée) | CANCELLED | 1 | 0 | 2 |

**Périmètre candidat à faire approuver séparément :** uniquement les identifiants de séance explicitement choisis dans ce tableau et leurs dépendances précisément sauvegardées ; aucune suppression automatique des 12 séances, des invitations ou des participations. Les huit séances non partagées ne sont pas pour autant autorisées à être supprimées. Les données détenues par d’autres comptes restent exclues.

**Inventaire local non observé :** ce poste ne donne pas accès au stockage Safari de l’iPhone. Les clés documentées plus haut doivent être inventoriées sur la bonne adresse Preview et le bon compte avant toute réinitialisation. Comptes différents, domaines Preview différents et IndexedDB ne doivent pas être vidés globalement. Le nombre de chiens, pistes, brouillons, associations et mémoires locales reste donc inconnu, et n’est pas annoncé nul.

Aucune sauvegarde complète des données réelles n’a été réalisée dans ce chantier (inventaire de métadonnées uniquement). Une sauvegarde complète, chiffrée et vérifiée, ainsi qu’une validation explicite de son inventaire, restent préalables à toute suppression. **Aucune donnée supprimée ou injectée.**
