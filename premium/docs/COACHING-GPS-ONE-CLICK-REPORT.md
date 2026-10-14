# Coaching — démarrage GPS en un clic

Base : dc2063a1cf8092b3943638612545b6b94dd8d77a.

Tracer la piste et Démarrer la recherche activent le GPS du téléphone autorisé, puis démarrent l’enregistrement au premier point exploitable. Les doubles clics pendant l’acquisition ne créent pas de deuxième surveillance. Le premier point est conservé. Les boutons séparés d’activation disparaissent des écrans prêts ; la reprise GPS reste accessible pendant l’enregistrement et l’activation logistique reste disponible pendant l’approche d’un départ géographique.

Refus, navigateur incompatible et indisponibilité sont affichés sans démarrage simulé. Le même bouton permet de réessayer. Les permissions locales, le mode QA, les filtres de visibilité, la pause et les métriques existantes sont conservés.

Validation : 147 tests ciblés passent, syntaxe des sept modules modifiés vérifiée. Aucune validation navigateur finale ; validation iPhone attendue sur Preview V2 dédiée. Aucun changement de main, V1, production, Supabase, SQL, RLS ou Auth.
