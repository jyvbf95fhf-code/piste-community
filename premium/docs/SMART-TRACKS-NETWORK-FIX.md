# Correctif de chargement du tracé intelligent — 14 octobre 2026

Base réutilisée : `86c9ddc4a540850f063151bba1db8a89f11fb12a`.

Symptôme iPhone : « Load failed » après « Proposer des tracés ». Reproduction HTTP avec les paramètres de Châtenois 67073 et des en-têtes Safari/Origin : Overpass refuse le GET en 406, sans Access-Control-Allow-Origin. Le navigateur ne peut pas lire cette réponse et remonte une erreur de réseau opaque. Le POST côté serveur avec un User-Agent identifiant PISTE retourne les données réelles en 200.

Le navigateur appelle désormais `/api/track-network` sur la même origine, avec ses cookies de protection Preview conservés. La CSP autorise cette origine et n’autorise plus l’appel direct à Overpass. La recherche de commune reste sur l’API publique de découpage administratif.

Le relais Node Vercel n’accepte qu’une longitude, une latitude et une distance de 0,5 à 10 km. Les paramètres multiples, paramètres supplémentaires, URL arbitraire et méthodes autres que GET sont refusés. La requête fournisseur est fixe : réseau piéton candidat dans un rayon borné, méthode POST, sans cookie, identité, token ou en-tête du membre. Le délai est borné à 30 secondes. Les réponses partielles et refus restent des erreurs françaises explicites. Les données renvoyées sont réduites aux nœuds, voies et tags nécessaires aux surfaces et restrictions d’accès, avec un plafond inférieur à la limite de réponse Vercel. Les restrictions, barrières et sens piétons sont conservés. Aucun tracé fictif n’est ajouté.

138 tests ciblés passent : transport sur la même origine, cookies Preview, cache existant, limites du relais, méthodes/paramètres invalides, refus et données partielles, génération et géométrie, accès Premium, formulaires/retour, créateur/GPX/routage et régressions GPS/confidentialité. Syntaxe des fichiers modifiés vérifiée.

Essai réel à Châtenois : POST fournisseur HTTP 200, 906 506 octets bruts ; après filtrage, environ 640 ko ; trois propositions mixtes de 2 km avec le souhait « peu » de transitions. Ce résultat valide la récupération et la génération, pas l’accessibilité sur le terrain.

Publication uniquement V2 Preview. Aucun changement main, V1/V10.55, production, Supabase, SQL, RLS ou Auth. Pas de contrôle navigateur final, conformément à la demande ; contrôle HTTP de l’API déployée requis avant remise du lien.
