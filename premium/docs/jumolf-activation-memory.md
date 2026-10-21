# Correctif de mémorisation JUMOLF

Base validée : ff2894434b0ed7c20bda79cf2b6436c4586d34e9 (Lot 5).
Branche : feature/v2-premium-jumolf-activation-memory.

## Cause et correction

Le store JUMOLF recréait activation, onboarding et consentements avec leurs valeurs initiales à chaque chargement ou reconnexion. Les droits serveur étaient conservés, mais leur utilisation nécessitait une nouvelle activation, y compris pour le propriétaire.

Le store existant conserve désormais uniquement les préférences dans localStorage, enveloppe versionnée et liée à l'identifiant du compte vérifié : activation, date d'activation, onboarding, consentements facultatifs et couches cartographiques. Aucun droit, rôle, code, résultat scientifique, analyse ou donnée métier n'est ajouté à cette enveloppe. Le mode démonstration et les visiteurs anonymes ne l'utilisent pas. Les autres données des Lots 1 à 5 restent inchangées.

Les droits Premium/Science/JUMOLF viennent toujours des mécanismes serveur existants. Le propriétaire reste couvert par la projection serveur owner_admin ; aucun privilège n'est inféré du nom ou d'une préférence locale. Une révocation ou expiration serveur interdit l'accès même si le choix d'activation reste mémorisé.

Déconnexion : les choix restent liés au compte sortant, puis sont restaurés uniquement pour ce même identifiant. Désactivation et retrait de chaque consentement sont enregistrés. Les modifications entre onglets sont relues avant écriture ; un événement storage actualise également la vue. Une enveloppe absente/incompatible ne rétablit aucun consentement. Les erreurs de stockage sont signalées sur les écrans accessibles, et un échec d'écriture tente d'effacer l'ancienne enveloppe pour éviter sa réactivation. Si le navigateur interdit à la fois lecture, écriture et suppression, aucune conservation durable du retrait ne peut être garantie : avertissement explicite, choix courant en mémoire uniquement. En cas de corruption lisible, une nouvelle activation explicite peut remplacer l'enveloppe sans restaurer ses anciens consentements.

## Portée et besoin backend non exécuté

Préférences locales à ce navigateur/appareil, indépendantes des consentements de contribution scientifique. Effacement des données du navigateur ou changement d'appareil : nouvelle activation et nouveaux choix requis. Aucune synchronisation cloud annoncée. Les analyses restent dans leur portée de visite existante et la mémoire pédagogique conserve sa portée du Lot 4.

Une conservation inter-appareils demanderait un contrat serveur versionné pour ces seuls choix, attaché à l'utilisateur vérifié, avec contrôle d'accès, horodatage et résolution des retraits concurrents. Ce contrat n'est pas ajouté aux champs cloud existants, et aucune modification SQL/RLS/Auth/Edge/Supabase n'est exécutée.

## Validation

- Régression reproduite avant correction : six échecs dans les premiers tests de préférences.
- 16 tests dédiés : rechargement/recréation, reconnexion, isolation, propriétaire, compte ordinaire, retrait, désactivation, droits absents/révoqués/expirés, corruption, panne de stockage et onglets concurrents.
- Suite ciblée de non-régression : JUMOLF, Mission Control, générateur, Coaching, permissions, Mes pistes, persistance, exports et Science réelle : 498 tests réussis, aucun échec.
- Test navigateur complet avec transport de comptes simulé, aucune écriture serveur : trois comptes, activation/reconnexion, rechargement, fermeture de page, retrait et désactivation, révocation serveur, erreurs de mémorisation ; largeurs 320/390/430/1280. 18 vérifications réussies, aucune erreur JavaScript. Ce test ne remplace pas une validation Safari sur appareil physique.
- Le test historique Lot 4 est adapté à la nouvelle conservation des choix ; ses autres assertions restent inchangées.

Aucun déploiement. Déploiements Git automatiques désactivés pour cette branche dans les deux configurations Vercel.
